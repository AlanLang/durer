import { DEMO_LAYOUTS, type DemoLayout } from "../spec";
import { type BlockConfig, LiveBlock } from "./live-block";

/** `<dr-react>`：渲染一个 React 组件，旁边是可编辑的源码，改完立即生效 */
export class DrReactElement extends LiveBlock {
  protected readonly config: BlockConfig = { withRetikz: false, figure: false };

  protected layout(): DemoLayout {
    const value = this.getAttribute("layout") as DemoLayout | null;
    return value && DEMO_LAYOUTS.includes(value) ? value : "split";
  }

  protected hasToolbar(): boolean {
    return true;
  }

  protected titleText(): string {
    return this.dataset.title ?? "";
  }

  protected captionText(): string {
    return "";
  }

  /** 原生 title 会在整块上冒浏览器提示框，读走之后就去掉 */
  public override connectedCallback(): void {
    const title = this.getAttribute("title");
    if (title !== null) {
      this.dataset.title = title;
      this.removeAttribute("title");
    }
    super.connectedCallback();
  }
}
