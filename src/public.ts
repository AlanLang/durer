// 页面接口：`dist/durer.d.ts` 从这里生成，顶部拼上 authoring.md，给写页面的 AI 读。
// 元素属性写成接口，只是为了带上说明给 AI 看；运行时按 spec.ts 的属性表认。
// 这里用行注释：JSDoc 会被原样带进 d.ts，AI 读到的应该只有怎么写页面。
import type { Diagnostic } from "./elements/status";
import type { BUILTIN_MODULES, CODE_LANGS, DemoLayout, TipPlacement } from "./spec";

export type { DemoLayout, Diagnostic, TipPlacement };

/** `<dr-code>` 能高亮的语言（`sh` / `shell` 也认作 bash） */
export type CodeLang = (typeof CODE_LANGS)[number];

/**
 * `<dr-react>`：渲染一个 React 组件，旁边是可编辑的源码，读者改完 250ms 后生效。
 *
 * 源码放在子元素 `<script type="text/jsx">`（要写 TypeScript 用 `text/tsx`）里，写成一个模块，
 * `export default` 要渲染的组件；组件用到的东西都要 import（可导入的见 {@link BuiltinModule}）。
 * 子元素 `<style>` 只作用于演示画面。
 *
 * **多文件**：写多个 `<script>`，每个带 `data-file="文件名"`，编辑器里显示成标签页。第一个 jsx / tsx 文件是入口，
 * 文件之间用相对路径 import（`import { clamp } from "./utils"`，扩展名可省）；`<script type="text/css" data-file="style.css">`
 * 是样式文件，读者改了立即生效、组件状态不清零。代码超过 40 行、或者想把「组件」和「工具函数」分开讲时用。
 *
 * 直接放在 `<dr-steps>` 里时，组件的 props 里有 `step`（当前第几步，0 起算）。
 *
 * ```html
 * <dr-react title="计数器">
 *   <script type="text/jsx">
 *     import { useState } from "react";
 *
 *     export default function Counter() {
 *       const [count, setCount] = useState(0);
 *       return <button onClick={() => setCount(count + 1)}>点了 {count} 次</button>;
 *     }
 *   </script>
 *   <style>button { padding: 6px 12px; }</style>
 * </dr-react>
 * ```
 */
export interface DrReactAttributes {
  /** 标题栏上的标题 */
  title?: string;
  /**
   * - `split`（默认）：宽度够（≥ 720px）时左预览右源码，不够时上下排；
   * - `stack`：预览在上、源码在下；
   * - `preview`：只显示预览，源码收在「源码」按钮后面。
   */
  layout?: DemoLayout;
  /** 源码只读：给读者看，不让改 */
  readonly?: boolean;
  /** 预览区最小高度，数字按 px，也可写 CSS 长度。组件高度会变的演示写上，免得页面跳动 */
  "preview-height"?: string;
  /** 源码区高度（同时是最大高度，超出滚动），默认随内容、最高 480px */
  "code-height"?: string;
}

/**
 * `<dr-retikz>`：用 retikz 的 JSX 画一张图（SVG）。
 *
 * 源码放在子元素 `<script type="text/jsx">` 里，整段是**一个** JSX 表达式，最外层是 `<Layout>`。
 * retikz 的组件（`Layout` `Node` `Draw` `Path` `Step` `Scope` `Text` `Coordinate` `Circle` `Rectangle` …）
 * 直接可用，不用 import。需要先算坐标、复用片段时，也可以写成和 `<dr-react>` 一样的模块（`export default`）。
 * 直接放在 `<dr-steps>` 里时，表达式能直接读 `step`（当前第几步，0 起算），模块写法从 props 拿。
 *
 * ```html
 * <dr-retikz caption="请求的一生">
 *   <script type="text/jsx">
 *     <Layout>
 *       <Node id="client" position={[0, 0]}>浏览器</Node>
 *       <Node id="server" position={[160, 0]}>服务器</Node>
 *       <Draw way={["client", "server"]} arrow="->" />
 *     </Layout>
 *   </script>
 * </dr-retikz>
 * ```
 */
export interface DrRetikzAttributes {
  /** 图下方的说明文字 */
  caption?: string;
  /** 显示「源码」按钮，读者能展开看和改这张图的源码 */
  "show-code"?: boolean;
  /** 展开的源码只读 */
  readonly?: boolean;
}

/**
 * `<dr-tip>`：正文里的一个词或一段话，悬停、聚焦或轻点时弹出解释气泡。
 *
 * 解释按顺序取第一个有的：
 * 1. `tip` 属性：一句纯文本；
 * 2. 子元素 `<template>`：富文本，可以放段落、列表、`<code>`、链接、图片，甚至 `<dr-retikz>`、
 *    嵌套的 `<dr-tip>`；
 * 3. `ref` 属性：指向页面上任意位置的 `<template id>`，同一个术语出现多次时只写一份。
 *
 * ```html
 * React 用 <dr-tip tip="内存里描述界面的一棵 JS 对象树">虚拟 DOM</dr-tip> 来比对变化。
 *
 * 每次渲染都会经过<dr-tip>协调<template>
 *   <p><strong>协调（reconciliation）</strong>：比较新旧两棵树，算出最少的 DOM 操作。</p>
 * </template></dr-tip>阶段。
 *
 * <dr-tip ref="fiber">Fiber</dr-tip> …… 后文又一次 <dr-tip ref="fiber">Fiber</dr-tip>
 * <template id="fiber"><p>React 16 起的协调引擎，把渲染拆成可中断的小单元。</p></template>
 * ```
 */
export interface DrTipAttributes {
  /** 纯文本解释 */
  tip?: string;
  /** 页面上某个 `<template>` 的 id，用它的内容做解释 */
  ref?: string;
  /** 气泡优先出现在哪一侧，默认 `top`；放不下会自动翻到对侧 */
  placement?: TipPlacement;
}

/**
 * `<dr-code>`：只展示、不运行的代码块 —— 语法高亮、行高亮、diff、多文件标签页、复制按钮。
 * 页面上要展示代码时一律用它，不要自己写 `<pre>` 再手拼高亮的 `<span>`。
 *
 * 代码放在子元素 `<script type="text/plain">` 里，`<` `>` `&` 原样写；代码里字面的 `</script>` 写成 `<\/script>`
 * （否则会提前结束外面这个 script），显示和复制时会还原。多个 `<script data-file="…">` 显示成标签页，
 * 每个文件可以单独写 `data-lang` / `data-highlight`，语言默认按扩展名认。
 *
 * ```html
 * <dr-code lang="tsx" title="Counter.tsx" highlight="4">
 *   <script type="text/plain">
 *     import { useState } from "react";
 *
 *     export function Counter() {
 *       const [count, setCount] = useState(0);
 *       return <button onClick={() => setCount(count + 1)}>{count}</button>;
 *     }
 *   </script>
 * </dr-code>
 *
 * <dr-code lang="js" diff>
 *   <script type="text/plain">
 *      function add(a, b) {
 *     -  return a - b;
 *     +  return a + b;
 *      }
 *   </script>
 * </dr-code>
 * ```
 */
export interface DrCodeAttributes {
  /** 语言，见 {@link CodeLang}；不写就按 `data-file` 的扩展名认，都没有就不高亮 */
  lang?: CodeLang;
  /** 标题栏上的文件名或说明；不写且只有一个文件时没有标题栏，复制按钮悬停才出现 */
  title?: string;
  /** 要高亮的行，1 起算：`"3"`、`"2,4-6"` */
  highlight?: string;
  /** 显示行号 */
  "line-numbers"?: boolean;
  /**
   * diff 模式：行首 `+` 是新增、`-` 是删除（这个字符只是标记，不算代码），其余行开头空一格对齐。
   * 复制按钮复制的是改完的样子
   */
  diff?: boolean;
}

/**
 * `<dr-steps>`：分步讲解。一次显示一步，读者用「上一步 / 下一步」、圆点、左右方向键翻页，也可以自动播放；
 * 所有步骤叠在同一格，容器高度取最高的一步，翻页时页面不跳。讲算法的执行过程、请求的往返、
 * 渲染流水线这类「状态一步步变」的内容时用它，不要把好几张几乎一样的静态图堆在一起。
 *
 * 两种写法，可以混着用：
 * 1. **每步自己的内容**：`<dr-step caption="说明">这一步要显示的东西</dr-step>`，内容可以是任意 HTML、
 *    `<dr-code>`、`<dr-retikz>`、`<dr-katex>`；
 * 2. **一张图跟着步骤变**：在 `<dr-steps>` 里直接放**一个** `<dr-retikz>`（或 `<dr-react>`），它读 `step`
 *    （0 起算）决定当前画什么；`<dr-step>` 只写 `caption`。
 *    每一步画**同一组节点**，用 `opacity`、`stroke`、`fill` 表示当前步和已完成的步，别让节点增减：
 *    图的范围变了，整张图会跟着缩放、跳动。
 *
 * ```html
 * <dr-steps title="一次请求">
 *   <dr-retikz>
 *     <script type="text/jsx">
 *       <Layout>
 *         <Node id="a" position={[0, 0]} strokeWidth={step === 0 ? 2 : 1}>浏览器</Node>
 *         <Node id="b" position={[180, 0]} strokeWidth={step === 1 ? 2 : 1}>服务器</Node>
 *         <Draw way={["a", "b"]} arrow="->" opacity={step >= 1 ? 1 : 0.2} />
 *       </Layout>
 *     </script>
 *   </dr-retikz>
 *   <dr-step caption="浏览器发出请求"></dr-step>
 *   <dr-step caption="服务器收到，开始处理"></dr-step>
 * </dr-steps>
 * ```
 */
export interface DrStepsAttributes {
  /** 标题栏上的标题，右侧自动显示「2 / 5」 */
  title?: string;
  /** 滚到眼前时自动播放（系统开了减少动态效果就不播）；读者一点按钮就停 */
  autoplay?: boolean;
  /** 自动播放时每步停留的毫秒数，默认 3000，至少 500 */
  interval?: string;
}

/** `<dr-step>`：`<dr-steps>` 里的一步，只能直接放在 `<dr-steps>` 下 */
export interface DrStepAttributes {
  /** 这一步的说明，显示在内容下方、带步骤序号；一句话说清这一步发生了什么 */
  caption?: string;
}

/**
 * `<dr-katex>`：一段 TeX 数学公式（KaTeX 排版，输出浏览器原生的 MathML）。元素的文字就是 TeX 源码。
 * 行内公式直接写在句子里，`display` 是独占一行、居中的块级公式。
 *
 * ```html
 * 质能方程 <dr-katex>E = mc^2</dr-katex> 说明……
 * <dr-katex display>\sum_{i=1}^{n} i = \frac{n(n+1)}{2}</dr-katex>
 * ```
 *
 * HTML 会把 `<` 当成标签开头：小于号写 `\lt`、大于号写 `\gt`，不要写 `<` `>`。`&`（矩阵对齐）可以直接写。
 * 公式写错时原样显示源码并标红，lint 和 `durer.ready()` 都会报出原因。
 */
export interface DrKatexAttributes {
  /** 块级公式：独占一行、居中、字号稍大 */
  display?: boolean;
}

/**
 * 演示代码里能 `import` 的模块。`@retikz/react` 就是 `<dr-retikz>` 里那套组件，
 * 在 `<dr-react>` 里要 import 才能用。其它包都没有 —— 页面跑在 CDN 上，没有 npm 可装。
 */
export type BuiltinModule = (typeof BUILTIN_MODULES)[number];

/** 运行时挂在 `window.durer` 上的接口 */
export interface Durer {
  /** 运行时版本 */
  readonly version: string;
  /**
   * 给演示代码多挂一个可 `import` 的模块。必须在用到它的元素渲染之前调用（写在引入运行时的
   * `<script>` 之后紧跟的脚本里）。页面通常用不着它，内置模块够写演示。
   */
  registerModule(name: string, mod: unknown): void;
  /** 当前能 `import` 的所有模块名 */
  modules(): string[];
  /** 页面上每个元素现在的状态：`loading` / `ready` / `error`（带原因） */
  diagnostics(): Diagnostic[];
  /** 等所有元素都画完或报错，返回 {@link Durer.diagnostics} 的结果；默认最多等 10 秒 */
  ready(timeout?: number): Promise<Diagnostic[]>;
}

declare global {
  interface Window {
    durer: Durer;
  }
}
