# 怎么写一份讲解型 HTML

一份页面就是一份完整的 HTML 文档：排版、配色、叙事全由你写的 HTML / CSS 决定。durer 只补 HTML 自己做不到、
或者手写容易写错的几件事：

| 想做的事 | 用 |
|---|---|
| 演示一段 React 代码的效果，读者能看、能改、改完立即生效 | `<dr-react>` |
| 画一张示意图（流程、架构、关系、几何），可选让读者看源码 | `<dr-retikz>`（retikz） |
| 正文里某个词 / 某句话，悬停弹出详细解释 | `<dr-tip>` |
| 展示一段不运行的代码：高亮、标出重点行、diff、多文件 | `<dr-code>` |
| 一步一步讲一个过程，读者翻页或自动播放 | `<dr-steps>` + `<dr-step>` |
| 数学公式 | `<dr-katex>` |

tab、折叠、提示框、卡片、布局这些用 HTML / CSS 自己写（`<details>` 就是折叠），不归 durer。

在 `<head>` 里引入运行时（版本号写死，不写 `latest`），元素就能用了，不用写任何初始化脚本：

    <script src="https://cdn.jsdelivr.net/npm/durer@{{VERSION}}/dist/durer.js"></script>

## 代码都写在 `<script>` 子元素里

`<dr-react>` 和 `<dr-retikz>` 的源码放在子元素 `<script type="text/jsx">` 中（TypeScript 用 `text/tsx`），
`<dr-code>` 展示的代码放在 `<script type="text/plain">` 中。浏览器不执行这些 script，里面的 `<` `>` `&` 原样保留，
**不要转义成 `&lt;`**，也不要用 `<template>` 或 `<pre>` 代替。缩进随页面写，运行时会去掉公共缩进再显示给读者。
代码里要出现字面的 `</script>`（讲 HTML 时常见）就写成 `<\/script>`，显示和复制时会还原。

## `<dr-react>`：可编辑的 React 演示

写成一个模块，`export default` 要渲染的组件。演示是给读者看的真实代码，**用到什么就 import 什么**：

    <dr-react title="受控输入框">
      <script type="text/jsx">
        import { useState } from "react";

        export default function App() {
          const [text, setText] = useState("");
          return (
            <label>
              名字：<input value={text} onChange={(e) => setText(e.target.value)} />
              <p>你好，{text || "陌生人"}</p>
            </label>
          );
        }
      </script>
      <style>
        input { padding: 4px 8px; }
      </style>
    </dr-react>

- 能 import 的只有 `react`、`react-dom`、`react-dom/client`、`@retikz/react`、`@retikz/core`（见 `BuiltinModule`）。
  页面跑在 CDN 上，**没有 npm**：lodash、axios、UI 组件库都没有，需要的小工具函数直接写在演示里。
- 演示的样式写在元素内的 `<style>` 里，只作用于这个演示，不影响页面；页面的样式也不会漏进演示。
  演示画面默认继承页面的字体和文字颜色，背景是透明的。演示里写了背景色就要同时写文字颜色（或者背景也用
  `transparent` / `color-mix(in srgb, currentColor 8%, transparent)` 这种跟着文字色走的写法），否则深色模式下字会看不见。
- 一个演示只讲一件事，代码控制在一屏（大约 40 行）以内；要讲多个点就放多个演示，中间用正文串起来。
- 组件高度会变化（展开、列表增删）时写 `preview-height`，免得读者一点按钮页面就跳。
- 读者会改代码：别依赖外部网络请求，别写 `window.location` 跳转、`alert`、死循环。
- 布局：`split`（默认，宽时左右分栏）适合代码和效果对照着看；正文窄或代码长用 `stack`；
  重点在效果、代码只是备查时用 `preview`。

代码超过 40 行、或者想把组件、工具函数、样式分开讲时，拆成**多个文件**：每个 `<script>` 写 `data-file`，
编辑器里显示成标签页。第一个 jsx / tsx 文件是入口（要 `export default` 组件），文件之间用相对路径 import；
`text/css` 的文件就是演示的样式，读者改了立即生效、组件状态不清零：

    <dr-react title="分页列表" layout="stack">
      <script type="text/jsx" data-file="App.jsx">
        import { useState } from "react";
        import { paginate } from "./paginate";
        import "./style.css";

        export default function App() { … }
      </script>
      <script type="text/jsx" data-file="paginate.js">
        export const paginate = (items, page, size) => items.slice(page * size, (page + 1) * size);
      </script>
      <script type="text/css" data-file="style.css">
        .list { display: grid; gap: 8px; }
      </script>
    </dr-react>

## `<dr-retikz>`：用 retikz 画图

源码是**一个** JSX 表达式，最外层是 `<Layout>`。retikz 的组件直接可用，**不写 import**：

    <dr-retikz caption="一次请求的往返">
      <script type="text/jsx">
        <Layout nodeDistance={200}>
          <Node id="client" position={[0, 0]}>浏览器</Node>
          <Node id="server" position={{ direction: "right", of: "client" }}>服务器</Node>
          <Node id="db" position={{ direction: "bottom", of: "server", distance: 110 }} shape="circle">数据库</Node>
          <Draw way={["client", { label: { text: "HTTP 请求", font: { size: 13 } } }, "server"]} arrow="->" />
          <Draw way={["server", "db"]} arrow="<->" dashPattern={[4, 3]} />
        </Layout>
      </script>
    </dr-retikz>

要先算坐标、循环生成节点时，改写成模块：顶层写常量和函数，`export default` 一个返回 `<Layout>` 的组件。

坐标与尺寸：
- 单位是 px，**y 轴朝下**（`[0, 60]` 在 `[0, 0]` 正下方）。图按内容自动定范围，按原始尺寸显示，
  页面窄时等比缩小。整张图宽度控制在 700 以内。
- 节点默认字号 16，一个中文字约 16 宽；`<Node>` 的盒子随文字撑开，自带内边距。
- 相对定位 `position={{ direction, of, distance }}` 的 `distance` 是**两个节点中心之间**的距离（默认取
  `<Layout nodeDistance>`，再缺省是 24），不是边框间距：要留出两个节点各自一半的宽度，否则会叠在一起。
  `direction` 取 `top` `bottom` `left` `right` `top-left` `top-right` `bottom-left` `bottom-right`。
- 节点多、关系规整时优先算好绝对坐标（`[x, y]`），比层层相对定位更可控。

常用写法（完整属性见 retikz 的类型声明，skill 里附了一份 `retikz.d.ts`；两处都没有的属性别猜）：

| 要画的 | 写法 |
|---|---|
| 节点 | `<Node id="a" position={[0, 0]}>文字</Node>`；`shape` 取 `rectangle`（默认）`circle` `ellipse` `diamond` |
| 圆角矩形 | `shape={{ type: "rectangle", params: { cornerRadius: 6 } }}` |
| 节点样式 | `fill` `stroke` `strokeWidth` `textColor` `dashed` `dotted` `opacity` `font={{ size: 13, weight: "bold" }}` `padding` `minimumSize`。**不要用 `color`**：它连填充一起染，文字会看不见 |
| 多行文字 | 子内容里写 `{"第一行\n第二行"}`，或 `maxTextWidth={120}` 自动折行 |
| 节点旁标签 | `label={{ text: "说明", position: "bottom" }}` |
| 连线 | `<Draw way={["a", "b"]} arrow="->" />`；`arrow` 取 `->` `<-` `<->`；途经点：`way={["a", [80, 40], "b"]}` |
| 连线文字 | 在那一段前面插 `{ label: "文字" }`：`way={["a", { label: "调用" }, "b"]}`；要调样式写对象 `{ label: { text, side: "bottom", font: { size: 13 }, textColor } }`。文字压在线的一侧、不会自动避让，两个节点之间要留出文字的宽度 |
| 折线 | `way={["a", "-|", "b"]}`（先横后竖）、`way={["a", "|-", "b"]}`（先竖后横） |
| 弯曲 | `way={["a", { bend: "left" }, "b"]}`，`bend` 取 `left` / `right`，`angle` 调弯度（默认 30） |
| 线样式 | `stroke` `strokeWidth` `dashPattern={[4, 3]}`（`<Draw>` 没有 `dashed`）`thickness="thick"` `roundedCorners={6}` |
| 闭合填充 | `way={[[0, 0], [100, 0], [50, 80], DrawWay.Cycle]}` 配 `fill`（`DrawWay` 也直接可用） |

颜色写具体色值（`#2f6feb`），默认的描边和文字是 `currentColor`，跟着页面文字颜色走，深色模式下自然可读；
填色要同时照顾亮暗两种背景，用低饱和浅色时把文字色写明。

- `show-code`：给读者一个「源码」按钮，展开后能改、改完立即重画。讲 retikz 本身、或图的构造方式值得一看时才加。
- `caption` 写在图下方；图的标题、编号等写在正文里。
- 承载**数据**的图（柱状、折线、饼图）不归这里，这里画的是示意图：结构、流程、关系、空间位置。

## `<dr-code>`：展示代码

页面上**所有**要展示的代码都用 `<dr-code>`，不要写 `<pre>` 再手拼高亮用的 `<span>`：

    <dr-code lang="tsx" title="Counter.tsx" highlight="4">
      <script type="text/plain">
        import { useState } from "react";

        export function Counter() {
          const [count, setCount] = useState(0);
          return <button onClick={() => setCount(count + 1)}>{count}</button>;
        }
      </script>
    </dr-code>

- `lang` 取 `jsx` `tsx` `js` `ts` `html` `css` `json` `bash` `text`；多文件时每个 `<script data-file="…">` 按扩展名认语言，
  显示成标签页，每个文件可以单独写 `data-highlight`。
- `highlight="2,4-6"` 标出正文正在讲的那几行（1 起算）；正文里说「注意第 4 行」时，这一行就该高亮。
- `diff`：行首 `+` 新增、`-` 删除，其余行开头空一格对齐。讲「改了什么」时用它，比贴两段代码清楚。
- `line-numbers` 只在正文要按行号引用、或者代码很长时才加。
- 要读者动手改、看效果的代码用 `<dr-react>`；只是展示（配置、命令、其他语言、HTML 片段）用 `<dr-code>`。

## `<dr-steps>`：分步讲解

一次显示一步，读者用按钮、圆点、左右方向键翻页，`autoplay` 时滚到眼前自动播放。讲算法的执行过程、
请求的往返、渲染流水线这类「状态一步步变」的内容时用它，**不要**把好几张几乎一样的图堆在一起。

写法一，每步自己的内容（任意 HTML、`<dr-code>`、`<dr-retikz>`、`<dr-katex>`）：

    <dr-steps title="冒泡排序的第一轮">
      <dr-step caption="比较前两个数：5 比 3 大，交换">…这一步的内容…</dr-step>
      <dr-step caption="比较 5 和 8：不交换">…</dr-step>
    </dr-steps>

写法二，一张图跟着步骤变：在 `<dr-steps>` 里直接放**一个** `<dr-retikz>`，它的源码能直接读 `step`（当前第几步，0 起算；
模块写法从 props 拿，`<dr-react>` 也一样），`<dr-step>` 只写 `caption`：

    <dr-steps title="一次请求">
      <dr-retikz>
        <script type="text/jsx">
          <Layout>
            <Node id="a" position={[0, 0]} strokeWidth={step === 0 ? 2 : 1}>浏览器</Node>
            <Node id="b" position={[180, 0]} strokeWidth={step === 1 ? 2 : 1}>服务器</Node>
            <Draw way={["a", "b"]} arrow="->" opacity={step >= 1 ? 1 : 0.2} />
          </Layout>
        </script>
      </dr-retikz>
      <dr-step caption="浏览器发出请求"></dr-step>
      <dr-step caption="服务器收到，开始处理"></dr-step>
    </dr-steps>

- 写法二里每一步都画**同一组节点**，用 `opacity` `stroke` `strokeWidth` `fill` 区分「当前」「已完成」「还没到」，
  别让节点增减：图的范围一变，整张图会跟着缩放、跳动。
- `caption` 一句话说清这一步发生了什么；更长的解释写在 `<dr-steps>` 前后的正文里。
- 3～8 步最合适；只有一步不用 `<dr-steps>`，十几步就该拆成两段。

## `<dr-katex>`：数学公式

元素的文字就是 TeX 源码，行内公式直接写在句子里，`display` 是独占一行的块级公式：

    时间复杂度是 <dr-katex>O(n \log n)</dr-katex>，因为……
    <dr-katex display>\sum_{i=1}^{n} i = \frac{n(n+1)}{2}</dr-katex>

- HTML 会把 `<` 当成标签开头：小于号写 `\lt`、大于号写 `\gt`，**不要写 `<` `>`**。
- 只在真的需要排版的地方用：`O(n)`、`n + 1` 这种简单的式子写成普通文字或 `<code>` 就行。
- 公式可以放进 `<dr-tip>` 的气泡和 `<dr-step>` 里；`<dr-retikz>` 的节点文字里不支持公式。

## `<dr-tip>`：悬浮解释

包住正文里需要解释的那个词或短语。解释三种写法，按长度选：

    一句话就够：<dr-tip tip="浏览器里描述页面结构的对象树">DOM</dr-tip>

    要分段、加粗、代码、链接：<dr-tip>闭包<template>
      <p><strong>闭包</strong>：函数连同它定义时的作用域一起被保存下来。</p>
      <p>所以 <code>setTimeout</code> 回调里读到的是<em>当时</em>那个变量。</p>
    </template></dr-tip>

    同一个术语出现多次，只写一份：<dr-tip ref="hoisting">变量提升</dr-tip>
    <template id="hoisting"><p>声明被移到作用域顶部，赋值留在原处。</p></template>

- 解释写在 `<template>` 里（不是 `<div>`）：template 不显示在正文里，只在气泡里出现。气泡里的内容吃页面的样式。
- `ref` 用的 `<template id>` 统一放在页面末尾（`</main>` 前），id 用英文短横线命名。
- 气泡里可以再放 `<dr-tip>`（解释里的术语再解释），也可以放小的 `<dr-retikz>`、`<dr-katex>`、短的 `<dr-code>`；
  不要放 `<dr-react>`。
- 气泡宽 360px 以内，解释写 1~3 段，长到要滚动的内容应该进正文。
- 只标读者**可能不懂**的词：同一段里最多两三个，同一术语只在第一次出现时标。
- `dr-tip` 是行内元素，可以包一个词、一个 `<code>`，也可以包半句话；不要包住整段或块级元素。

## 页面怎么写

- 页面自己定字体、版心（正文 680～860px 宽）、配色；写 `:root { color-scheme: light dark }` 时元素跟着系统切换深浅色，
  只写 `light` 或不写就是浅色。元素的配色可以在 `:root` 上用 `--durer-bg` `--durer-surface` `--durer-border`
  `--durer-fg` `--durer-muted` `--durer-accent` `--durer-radius` `--durer-font-mono` `--durer-tip-width` 改。
- 讲解的节奏：先一句话说结论，再给一个能改的演示或一张图，再解释为什么。演示和图之间要有正文过渡，不要堆在一起。
- 不要自己写页面脚本去操作这些元素的内部（它们在 shadow DOM 里）。
- 写完先跑 lint（编译每段源码、核对导入和 ref），再用浏览器打开，`await durer.ready()` 拿到每个元素的状态，
  全是 `ready` 才算写完。
