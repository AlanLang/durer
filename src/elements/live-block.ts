import { collectFiles, type SourceFile, scriptsOf } from "../source";
import type { DemoLayout } from "../spec";
import blockCss from "../styles/block.css?raw";
import stageCss from "../styles/stage.css?raw";
import tokensCss from "../styles/tokens.css?raw";
import { loadEditor } from "./loaders";
import { type ElementState, markSettled, track } from "./status";
import { whenParsed } from "./whenParsed";

type Live = typeof import("../live");
type Editor = import("../live/editor").Editor;
type Mount = import("../live/render").Mount;

/** 敲字时不是每个键都重编一次：停 250ms 再编，半截代码的报错不会一直闪 */
const EDIT_DEBOUNCE = 250;

let livePromise: Promise<Live> | null = null;
const loadLive = (): Promise<Live> => {
  livePromise ??= import(/* webpackChunkName: "live" */ "../live");
  return livePromise;
};

export interface BlockConfig {
  /** retikz 组件直接放进作用域（`<dr-retikz>`） */
  withRetikz: boolean;
  /** 图：没有卡片边框和标题栏，下方是 caption */
  figure: boolean;
}

/**
 * `<dr-react>` 和 `<dr-retikz>` 共用的那一套：读源码、编译、渲染、出错提示、编辑器、实时生效、多文件。
 * 两者的差别只在外观和作用域，见各自的子类。
 */
export abstract class LiveBlock extends HTMLElement {
  protected abstract readonly config: BlockConfig;

  private shadow: ShadowRoot | null = null;
  /** 作者写的那一版，「重置」回到这里 */
  private files: SourceFile[] = [];
  /** 读者改过之后的代码，和 files 一一对应 */
  private current: string[] = [];
  private active = 0;
  private revision = 0;
  private props: Record<string, unknown> = {};
  private mounted: Mount | null = null;
  private editors = new Map<number, Editor>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private els: {
    frame: HTMLElement;
    title: HTMLElement;
    codeButton: HTMLButtonElement;
    resetButton: HTMLButtonElement;
    copyButton: HTMLButtonElement;
    /** 演示组件挂在这里：stage 自己的 shadow root 里，和标题栏、编辑器的样式互不干扰 */
    container: HTMLElement;
    /** 演示画面的样式：`<style>` 子元素 + 样式文件，样式文件改了只换它、不重编 */
    stageStyle: HTMLStyleElement;
    code: HTMLElement;
    tabs: HTMLElement;
    panes: HTMLElement;
    error: HTMLElement;
    caption: HTMLElement;
  } | null = null;

  public state: ElementState = { state: "loading" };

  /** 当前布局；`<dr-retikz>` 恒为 preview（源码靠按钮展开） */
  protected abstract layout(): DemoLayout;
  /** 标题栏里有没有东西可放：图默认没有，写了 show-code 才有 */
  protected abstract hasToolbar(): boolean;
  protected abstract titleText(): string;
  protected abstract captionText(): string;

  public connectedCallback(): void {
    if (this.shadow) {
      // 从页面上摘下来又放回去：断开时卸掉了组件，这里照当前源码重新挂上
      if (!this.mounted && this.files.length) void this.run();
      return;
    }
    track(this);
    whenParsed(this, () => this.init());
  }

  public disconnectedCallback(): void {
    // 被挪到别处（insertBefore / 外层重排）会先断开再连上，等一拍再判断是不是真的移走了。
    // 组件卸掉（停掉它的定时器、副作用）；编辑器留着，放回来时内容还在
    queueMicrotask(() => {
      if (this.isConnected) return;
      clearTimeout(this.timer);
      this.mounted?.unmount();
      this.mounted = null;
    });
  }

  /**
   * `<dr-steps>` 翻页时调：组件收到新的 `step`，同一个实例、状态保留。
   * 还没画出来时先记着，第一次渲染就带上。
   */
  public setStep(step: number): void {
    this.props = { ...this.props, step };
    this.mounted?.setProps(this.props);
  }

  private init(): void {
    this.files = collectFiles(scriptsOf(this), ["script", "style"]);
    this.current = this.files.map((file) => file.code);
    this.shadow = this.attachShadow({ mode: "open" });
    this.renderChrome();
    if (!this.files.some((file) => file.kind === "script")) {
      this.fail(`缺少源码：在 <${this.localName}> 里放一个 <script type="text/jsx">`);
      return;
    }
    if (this.layout() !== "preview") this.showCode(true);
    void this.run();
  }

  private renderChrome(): void {
    const shadow = this.shadow as ShadowRoot;
    const { figure } = this.config;
    const layout = this.layout();
    shadow.innerHTML = `
      <style>${tokensCss}${blockCss}</style>
      <${figure ? "figure" : "div"} class="frame${figure ? " figure" : ""}" part="frame" data-layout="${layout}">
        <div class="bar" part="toolbar"${this.hasToolbar() ? "" : " hidden"}>
          <span class="title" part="title"></span>
          <button type="button" data-act="code" aria-pressed="false"${layout === "preview" ? "" : " hidden"}>源码</button>
          <button type="button" data-act="reset" hidden>重置</button>
          <button type="button" data-act="copy" hidden>复制</button>
        </div>
        <div class="body">
          <div class="preview" part="preview"><div class="stage"></div></div>
          <div class="code" part="code" hidden>
            <div class="tabs" role="tablist" hidden></div>
            <div class="panes"></div>
          </div>
        </div>
        <pre class="error" part="error" role="alert" hidden></pre>
        ${figure ? '<figcaption part="caption"></figcaption>' : ""}
      </${figure ? "figure" : "div"}>`;
    const $ = <T extends HTMLElement>(selector: string) => shadow.querySelector(selector) as T;
    const stage = this.createStage($(".stage"));
    this.els = {
      frame: $(".frame"),
      title: $(".title"),
      codeButton: $('[data-act="code"]'),
      resetButton: $('[data-act="reset"]'),
      copyButton: $('[data-act="copy"]'),
      container: stage.container,
      stageStyle: stage.style,
      code: $(".code"),
      tabs: $(".tabs"),
      panes: $(".panes"),
      error: $(".error"),
      caption: $("figcaption") ?? document.createElement("span"),
    };
    if (this.config.figure && !this.hasToolbar()) this.els.title.parentElement?.remove();
    this.els.title.textContent = this.titleText();
    this.els.caption.textContent = this.captionText();
    this.renderTabs();
    this.applySizes();
    this.els.codeButton.addEventListener("click", () => {
      this.showCode(this.els?.code.hidden ?? false);
    });
    this.els.resetButton.addEventListener("click", () => this.reset());
    this.els.copyButton.addEventListener("click", () => void this.copy());
  }

  /** 一个文件不出标签页；多个文件时每个一页，编辑器在第一次切到时才建 */
  private renderTabs(): void {
    const els = this.els;
    if (!els) return;
    els.tabs.hidden = this.files.length < 2;
    this.files.forEach((file, index) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.role = "tab";
      tab.textContent = file.name;
      tab.addEventListener("click", () => this.selectFile(index));
      els.tabs.append(tab);
      const pane = document.createElement("div");
      pane.className = "pane";
      pane.role = "tabpanel";
      els.panes.append(pane);
    });
    this.markActiveTab();
  }

  private markActiveTab(): void {
    const els = this.els;
    if (!els) return;
    [...els.tabs.children].forEach((tab, index) => {
      tab.setAttribute("aria-selected", String(index === this.active));
    });
    [...els.panes.children].forEach((pane, index) => {
      (pane as HTMLElement).hidden = index !== this.active;
    });
  }

  private selectFile(index: number): void {
    this.active = index;
    this.markActiveTab();
    void this.openEditor(index);
  }

  private applySizes(): void {
    const set = (name: string, value: string | null) => {
      if (value)
        this.els?.frame.style.setProperty(name, /^\d+$/.test(value) ? `${value}px` : value);
    };
    set("--_preview-height", this.getAttribute("preview-height"));
    const codeHeight = this.getAttribute("code-height");
    set("--_code-height", codeHeight);
    set("--_code-max-height", codeHeight);
  }

  private showCode(visible: boolean): void {
    const els = this.els;
    if (!els) return;
    els.code.hidden = !visible;
    els.codeButton.setAttribute("aria-pressed", String(visible));
    els.copyButton.hidden = !visible;
    if (visible) void this.openEditor(this.active);
  }

  private async openEditor(index: number): Promise<void> {
    const pane = this.els?.panes.children[index] as HTMLElement | undefined;
    const file = this.files[index];
    if (!pane || !file || pane.firstChild) return;
    // 编辑器加载前先把源码原样摆出来，加载完再换掉：不闪空白
    const fallback = document.createElement("pre");
    fallback.className = "fallback";
    fallback.textContent = this.current[index] ?? "";
    pane.append(fallback);
    const { createEditor } = await loadEditor();
    if (!this.isConnected) return;
    fallback.remove();
    this.editors.set(
      index,
      createEditor({
        parent: pane,
        root: this.shadow as ShadowRoot,
        value: this.current[index] ?? "",
        lang: file.lang,
        readonly: this.hasAttribute("readonly"),
        onChange: (value) => this.edit(index, value),
      }),
    );
  }

  private edit(index: number, value: string): void {
    this.current[index] = value;
    this.updateResetButton();
    if (this.files[index]?.kind === "style") {
      // 样式文件只换样式，组件不重挂：读者调颜色时计数器之类的状态不会清零
      this.applyStageStyles();
      return;
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.run(), EDIT_DEBOUNCE);
  }

  private updateResetButton(): void {
    if (!this.els) return;
    this.els.resetButton.hidden = this.current.every((code, i) => code === this.files[i]?.code);
  }

  private reset(): void {
    clearTimeout(this.timer);
    this.files.forEach((file, index) => {
      this.current[index] = file.code;
      this.editors.get(index)?.setValue(file.code);
    });
    this.updateResetButton();
    this.applyStageStyles();
    void this.run();
  }

  private async copy(): Promise<void> {
    const button = this.els?.copyButton;
    try {
      await navigator.clipboard.writeText(this.current[this.active] ?? "");
      if (button) button.textContent = "已复制";
    } catch {
      if (button) button.textContent = "复制失败";
    }
    setTimeout(() => {
      if (button) button.textContent = "复制";
    }, 1200);
  }

  private async run(): Promise<void> {
    this.revision += 1;
    const revision = this.revision;
    let live: Live;
    try {
      live = await loadLive();
    } catch (error) {
      this.fail(`运行时没加载上：${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    // 等加载的这段时间里源码又改了，这一版作废
    if (revision !== this.revision || !this.els) return;
    const files = this.files.map((file, index) => ({ ...file, code: this.current[index] ?? "" }));
    const built = live.build(files, this.config.withRetikz);
    if (!built.ok) {
      // 编不过时留着上一版能跑的画面，只在下面提示错误：边改边看时不会一直白屏
      this.fail(built.message);
      return;
    }
    const container = this.els.container;
    this.mounted ??= live.mount(container);
    this.clearError();
    this.mounted.render(built.component, this.props, {
      onError: (error) => this.fail(error.message),
      onCommit: () => {
        if (this.config.withRetikz) fitSvg(container);
        if (this.state.state === "loading") this.settle({ state: "ready" });
      },
    });
  }

  private createStage(stage: HTMLElement): { container: HTMLElement; style: HTMLStyleElement } {
    const root = stage.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    const container = document.createElement("div");
    if (this.config.withRetikz) container.className = "durer-figure";
    root.append(style, container);
    queueMicrotask(() => this.applyStageStyles());
    return { container, style };
  }

  /** 元素里的 `<style>` 和样式文件只作用于演示画面，不漏到页面，也不影响标题栏和编辑器 */
  private applyStageStyles(): void {
    if (!this.els) return;
    const inline = [...this.children]
      .filter((el) => el.localName === "style")
      .map((el) => el.textContent ?? "");
    const files = this.files.flatMap((file, index) =>
      file.kind === "style" ? [this.current[index] ?? ""] : [],
    );
    this.els.stageStyle.textContent = [stageCss, ...inline, ...files].join("\n");
  }

  private fail(message: string): void {
    if (this.els) {
      this.els.error.textContent = message;
      this.els.error.hidden = false;
    }
    this.settle({ state: "error", message });
  }

  private clearError(): void {
    if (this.els) this.els.error.hidden = true;
    this.state = { state: "loading" };
  }

  private settle(state: ElementState): void {
    this.state = state;
    this.dataset.state = state.state;
    markSettled(this);
  }
}

/**
 * retikz 的 `<svg>` 只有 viewBox、没有尺寸，放进居中的容器里会缩成 0 宽。
 * 没写 width 的就按 viewBox 的原始大小画（1 个单位 = 1px），容器窄时由 max-width 等比缩小。
 * 每次提交都重算：`<dr-steps>` 翻页时图的范围可能变。作者自己写了 width 的不动。
 */
function fitSvg(container: HTMLElement): void {
  for (const svg of container.querySelectorAll<SVGSVGElement>(":scope > svg")) {
    if (svg.hasAttribute("width") || (svg.style.width && !svg.dataset.drFit)) continue;
    const box = svg.viewBox.baseVal;
    if (!box?.width) continue;
    svg.style.width = `${Math.ceil(box.width)}px`;
    svg.dataset.drFit = "";
  }
}
