import type { DemoLayout } from "../spec";
import { type BlockConfig, LiveBlock } from "./live-block";

/**
 * `<dr-retikz>`：用 retikz 的 JSX 画一张图。Layout / Node / Draw 等组件不用 import；
 * 写了 `show-code` 才出「源码」按钮，读者能展开看、改。
 */
export class DrRetikzElement extends LiveBlock {
  protected readonly config: BlockConfig = { withRetikz: true, figure: true };

  protected layout(): DemoLayout {
    return "preview";
  }

  protected hasToolbar(): boolean {
    return this.hasAttribute("show-code");
  }

  protected titleText(): string {
    return "";
  }

  protected captionText(): string {
    return this.getAttribute("caption") ?? "";
  }
}
