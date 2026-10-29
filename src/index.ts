/**
 * 运行时入口（`dist/durer.js`）：注册元素，挂 `window.durer`。
 * 这一份很小；React、retikz、编译器在 live chunk 里，页面上有演示或图时才下载；
 * CodeMirror 和各语言语法在 editor chunk（编辑器、`<dr-code>` 高亮），KaTeX 在 math chunk。
 */
import { DrCodeElement } from "./elements/dr-code";
import { DrKatexElement } from "./elements/dr-katex";
import { DrReactElement } from "./elements/dr-react";
import { DrRetikzElement } from "./elements/dr-retikz";
import { DrStepElement, DrStepsElement } from "./elements/dr-steps";
import { DrBubbleElement, DrTipElement } from "./elements/dr-tip";
import { diagnostics, ready } from "./elements/status";
import type { Durer } from "./public";
import { moduleNames, registerModule } from "./registry";

const define = (name: string, ctor: CustomElementConstructor) => {
  // 页面重复引入了运行时（两个 <script>），第二份不再注册，也不报错
  if (!customElements.get(name)) customElements.define(name, ctor);
};

define("dr-react", DrReactElement);
define("dr-retikz", DrRetikzElement);
define("dr-tip", DrTipElement);
define("dr-bubble", DrBubbleElement);
define("dr-code", DrCodeElement);
define("dr-katex", DrKatexElement);
define("dr-step", DrStepElement);
// 最后注册：它要调里面 <dr-react> / <dr-retikz> 的 setStep，那时它们已经升级好了
define("dr-steps", DrStepsElement);

const api: Durer = {
  version: __DURER_VERSION__,
  registerModule,
  modules: moduleNames,
  diagnostics,
  ready,
};

window.durer ??= api;
