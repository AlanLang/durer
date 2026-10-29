import { collectFiles, escapeHtml, type SourceFile, scriptsOf } from "../source";
import { parseLineRanges, resolveLang } from "../spec";
import codeCss from "../styles/code.css?raw";
import tokensCss from "../styles/tokens.css?raw";
import { loadEditor } from "./loaders";
import { type ElementState, markSettled, track } from "./status";
import { whenParsed } from "./whenParsed";

type LineMark = "add" | "del" | null;

/** diff 模式：行首的 `+` / `-` 是标记，不是代码；去掉后再交给高亮 */
function splitDiff(code: string, diff: boolean): { text: string; marks: LineMark[] } {
  const lines = code.split("\n");
  if (!diff) return { text: code, marks: lines.map(() => null) };
  const marks = lines.map(
    (line): LineMark => (line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : null),
  );
  const text = lines.map((line, i) => (marks[i] ? line.slice(1) : line)).join("\n");
  return { text, marks };
}

/**
 * `<dr-code>`：只展示、不运行的代码块 —— 语法高亮、行高亮、diff、多文件标签页、复制。
 * 代码写在 `<script type="text/plain">` 里，原样保留 `<` `>`；字面的 `</script>` 写成 `<\/script>`。
 */
export class DrCodeElement extends HTMLElement {
  public state: ElementState = { state: "loading" };

  private files: SourceFile[] = [];
  private active = 0;
  private panes: HTMLPreElement[] = [];
  private tabs: HTMLButtonElement[] = [];

  public connectedCallback(): void {
    if (this.shadowRoot) return;
    track(this);
    whenParsed(this, () => this.init());
  }

  private init(): void {
    const lang = resolveLang(this.getAttribute("lang") ?? "") ?? "text";
    this.files = collectFiles(scriptsOf(this), ["plain"], lang);
    const shadow = this.attachShadow({ mode: "open" });
    const title = this.getAttribute("title");
    if (title !== null) {
      // 原生 title 会在整块上冒浏览器提示框
      this.dataset.title = title;
      this.removeAttribute("title");
    }
    const multi = this.files.length > 1;
    const showBar = multi || Boolean(this.dataset.title);
    shadow.innerHTML = `<style>${tokensCss}${codeCss}</style>
      <div class="frame" part="frame">
        <div class="bar" part="toolbar"${showBar ? "" : " hidden"}>
          ${multi ? '<div class="tabs" role="tablist"></div>' : '<span class="title"></span>'}
          <button type="button" data-act="copy">复制</button>
        </div>
        ${showBar ? "" : '<button type="button" class="float" data-act="copy">复制</button>'}
        <div class="panes"></div>
      </div>`;
    const title_ = shadow.querySelector(".title");
    if (title_) title_.textContent = this.dataset.title ?? "";
    for (const button of shadow.querySelectorAll<HTMLButtonElement>('[data-act="copy"]')) {
      button.addEventListener("click", () => void this.copy(button));
    }
    if (!this.files.length) {
      this.settle({
        state: "error",
        message: '缺少代码：在 <dr-code> 里放一个 <script type="text/plain">',
      });
      return;
    }
    const panes = shadow.querySelector(".panes") as HTMLElement;
    const tabs = shadow.querySelector(".tabs");
    this.files.forEach((file, index) => {
      const pre = document.createElement("pre");
      pre.setAttribute("part", "code");
      pre.innerHTML = this.renderLines(file, index, null);
      panes.append(pre);
      this.panes.push(pre);
      if (tabs) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.role = "tab";
        tab.textContent = file.name;
        tab.addEventListener("click", () => this.select(index));
        tabs.append(tab);
        this.tabs.push(tab);
      }
    });
    this.select(0);
    void this.highlight();
  }

  private select(index: number): void {
    this.active = index;
    this.panes.forEach((pane, i) => {
      pane.hidden = i !== index;
    });
    this.tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
    });
  }

  private async highlight(): Promise<void> {
    try {
      const { highlightLines } = await loadEditor();
      this.files.forEach((file, index) => {
        const { text } = splitDiff(file.code, this.hasAttribute("diff"));
        const pane = this.panes[index];
        if (pane) pane.innerHTML = this.renderLines(file, index, highlightLines(text, file.lang));
      });
    } catch {
      // 高亮没加载上就留着纯文本：代码照样能读、能复制，不算这个元素坏了
    }
    this.settle({ state: "ready" });
  }

  /** `highlighted` 为 null 时是还没高亮的纯文本版本 */
  private renderLines(file: SourceFile, index: number, highlighted: string[] | null): string {
    const diff = this.hasAttribute("diff");
    const { text, marks } = splitDiff(file.code, diff);
    const source = highlighted ?? text.split("\n").map(escapeHtml);
    const ranges = file.highlight ?? (index === 0 ? this.getAttribute("highlight") : null);
    const hl = new Set(ranges ? parseLineRanges(ranges).lines : []);
    const numbers = this.hasAttribute("line-numbers");
    const lines = source.map((html, i) => {
      const mark = marks[i];
      const cls = ["line", hl.has(i + 1) ? "hl" : "", mark ?? ""].filter(Boolean).join(" ");
      const ln = numbers ? `<span class="ln">${i + 1}</span>` : "";
      const sign = diff
        ? `<span class="mark">${mark === "add" ? "+" : mark === "del" ? "−" : ""}</span>`
        : "";
      return `<span class="${cls}">${ln}${sign}<span class="txt">${html || " "}</span></span>`;
    });
    return `<code>${lines.join("")}</code>`;
  }

  /** diff 模式复制的是改完的样子：删掉的行不要，加的行去掉 `+` */
  private async copy(button: HTMLButtonElement): Promise<void> {
    const file = this.files[this.active];
    if (!file) return;
    const { text, marks } = splitDiff(file.code, this.hasAttribute("diff"));
    const result = text
      .split("\n")
      .filter((_, i) => marks[i] !== "del")
      .join("\n");
    try {
      await navigator.clipboard.writeText(result);
      button.textContent = "已复制";
    } catch {
      button.textContent = "复制失败";
    }
    setTimeout(() => {
      button.textContent = "复制";
    }, 1200);
  }

  private settle(state: ElementState): void {
    this.state = state;
    this.dataset.state = state.state;
    markSettled(this);
  }
}
