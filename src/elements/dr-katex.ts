import mathCss from "../styles/math.css?raw";
import tokensCss from "../styles/tokens.css?raw";
import { loadMath } from "./loaders";
import { type ElementState, markSettled, track } from "./status";
import { whenParsed } from "./whenParsed";

/**
 * `<dr-katex>`：一段 TeX 公式。元素的文字就是 TeX 源码（`<dr-katex>E = mc^2</dr-katex>`），
 * 写了 `display` 是独占一行的块级公式。公式写错时原样显示源码并标红，`durer.ready()` 报出原因。
 */
export class DrKatexElement extends HTMLElement {
  public state: ElementState = { state: "loading" };

  public connectedCallback(): void {
    if (this.shadowRoot) return;
    track(this);
    // 没渲染出来之前，light DOM 里的 TeX 源码先当文字显示（slot），不闪空白
    this.attachShadow({
      mode: "open",
    }).innerHTML = `<style>${tokensCss}${mathCss}</style><slot></slot>`;
    whenParsed(this, () => void this.render());
  }

  private async render(): Promise<void> {
    const shadow = this.shadowRoot as ShadowRoot;
    const tex = (this.textContent ?? "").trim();
    if (!tex) {
      this.settle({ state: "error", message: "公式是空的：TeX 源码写在元素里面" });
      return;
    }
    let result: Awaited<ReturnType<typeof import("../live/math")["renderMath"]>>;
    try {
      const { renderMath } = await loadMath();
      result = renderMath(tex, this.hasAttribute("display"));
    } catch (error) {
      result = {
        ok: false,
        message: `公式引擎没加载上：${error instanceof Error ? error.message : String(error)}`,
      };
    }
    const body = document.createElement("span");
    if (result.ok) {
      body.innerHTML = result.html;
    } else {
      body.className = "error";
      body.textContent = tex;
      body.title = result.message;
    }
    shadow.querySelector("slot")?.replaceWith(body);
    this.settle(result.ok ? { state: "ready" } : { state: "error", message: result.message });
  }

  private settle(state: ElementState): void {
    this.state = state;
    this.dataset.state = state.state;
    markSettled(this);
  }
}
