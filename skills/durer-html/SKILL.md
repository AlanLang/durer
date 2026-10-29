---
name: durer-html
description: 用 durer 运行时手写一份讲解型 HTML 页面：可编辑、改完立即生效的 React 代码演示（<dr-react>，支持多文件），用 retikz 画的示意图（<dr-retikz>），悬停弹出详细解释的术语（<dr-tip>），高亮代码块（<dr-code>），分步讲解（<dr-steps>），数学公式（<dr-katex>）。用户说「写/做一个 HTML 讲解页」「做个可交互的教程 / 技术文章 / 原理讲解」「用 durer 写」「页面里要能演示 React 组件、能改代码」「画个流程图 / 架构图放进页面」「给术语加悬浮解释」时触发；改已有的 durer 页面时也用它。不用于：数据分析报告（真实取数、图表联动走 lewitt）、要进代码仓库的组件文档站。
---

# durer：写讲解型 HTML

页面是一份完整、独立的 HTML 文件。排版、配色、叙事由你写的 HTML / CSS 决定；durer 运行时（一个 `<script>`）
只补 HTML 做不到或手写容易错的几件事：**可编辑的 React 演示**、**retikz 示意图**、**悬浮解释**、**代码高亮**、
**分步讲解**、**数学公式**。

```bash
S=~/.claude/skills/durer-html
```

| 步骤 | 做什么 |
|---|---|
| 1 读接口 | **完整读一遍** `$S/references/durer.d.ts`（顶部是编写指导，后面是每个元素的属性） |
| 2 定提纲 | 读者是谁、要懂什么；每节用哪种元素讲 |
| 3 写页面 | 一份 `.html`，`<head>` 里引入运行时 |
| 4 lint | `node $S/scripts/lint.mjs <页面.html>`，error 清零 |
| 5 浏览器验 | 打开页面，`await durer.ready()` 全部 `ready`，截图看排版、悬停看气泡 |

## 1. 读接口

`durer.d.ts` 就是全部接口：元素、属性、能 import 的模块、retikz 常用写法、页面写法约定都在里面，
**以它为准，不要凭印象写**。运行时的 CDN 地址也以它顶部那一行为准（版本号写死）。

画图要用到 `durer.d.ts` 速查表之外的 retikz 属性时，在 `$S/references/retikz.d.ts` 里按组件名查
（`grep -n "export type NodeProps" -A80` 这样读一段），**两处都没有的属性就是没有**，换个画法。

## 2. 定提纲：哪种内容用哪个元素

| 内容 | 用 | 不要 |
|---|---|---|
| 「这段代码跑起来是什么样」「改这里会怎样」 | `<dr-react>`，一个演示只讲一件事 | 只贴静态代码块让读者想象效果 |
| 结构、流程、调用关系、状态流转、空间位置 | `<dr-retikz>` | 用 ASCII 图、手写 `<svg>` 路径、用 `<div>` 拼框框箭头 |
| 读者可能不懂、但展开讲会打断正文的术语 | `<dr-tip>` | 把解释塞进括号、脚注，或每个词都标 |
| 只是展示、不需要运行的代码（配置、命令、HTML 片段、改了什么） | `<dr-code>`，讲到的行用 `highlight`，改动用 `diff` | 手写 `<pre>` 拼高亮 `<span>`；为了「能改」把所有代码都做成演示 |
| 一个过程分几步发生（算法执行、请求往返、渲染流水线） | `<dr-steps>`，最好一张读 `step` 的图 + 每步一句 caption | 把几张几乎一样的图堆在一起 |
| 需要排版的数学式子 | `<dr-katex>`（块级加 `display`） | 用图片、Unicode 拼上下标 |
| 演示代码超过 40 行，或要把组件 / 工具函数 / 样式分开讲 | 多文件 `<dr-react>`（`data-file`） | 塞进一个文件 |

节奏：结论一句话 → 演示或图 → 解释为什么 → 下一个点。演示和图之间要有正文过渡。

## 3. 写页面

- 文件放在用户指定的位置；没指定就放当前目录，文件名用英文短横线（`react-rendering.html`）。
- `<head>` 里第一件事是引入运行时：`durer.d.ts` 顶部给的 `<script src="…durerjs@x.y.z/dist/durer.js">`。
- 页面自己写完整的 CSS：版心、字体、标题层级、代码样式、亮暗色（`:root { color-scheme: light dark }`）。
  durer 的元素会跟着页面的 `color-scheme` 切换，配色用 `--durer-*` 变量微调（见 d.ts）。
- 演示源码写在 `<script type="text/jsx">` 里，展示的代码写在 `<script type="text/plain">` 里，`<` `>` 原样写，不转义；
  代码里的 `</script>` 写成 `<\/script>`。公式里的 `<` `>` 写成 `\lt` `\gt`。
- 共用的术语解释 `<template id>` 统一放在页面末尾。
- 不写页面脚本去操作 durer 元素的内部；不引入其他前端库。

改已有页面时：先读整份 HTML，只动要改的那几处，改完同样走 4、5 两步。

## 4. lint

```bash
node $S/scripts/lint.mjs page.html          # 人读的输出，有 error 时退出码 1
node $S/scripts/lint.mjs page.html --json   # 结构化输出
```

它用和运行时同一个编译器编每段源码（报错行号对到 HTML 文件的行），核对 import 白名单、属性名和取值、
`dr-tip` 的解释与 `ref`。**error 必须清零**；warning 逐条看，确实是有意为之才留着。

## 5. 浏览器验证

lint 管不到渲染期的错（组件运行时抛异常、retikz 属性写错导致画不出来），必须在浏览器里看一遍。
用 playwright-cli（没有就用可用的浏览器工具）：

```bash
playwright-cli -s=durer open "file://$PWD/page.html"
playwright-cli -s=durer --raw eval "durer.ready().then(d => JSON.stringify(d.filter(x => x.state !== 'ready')))"
# 期望输出 "[]"；否则按 ref 和 message 去改（ref 是元素 id，没写 id 时是 dr-react#2 这样的序号）
playwright-cli -s=durer screenshot --filename=page.png          # 看整体排版
playwright-cli -s=durer hover "dr-tip >> nth=0"               # 看气泡
playwright-cli -s=durer set-color-scheme dark                    # 看深色模式下文字和图是否可读
```

截长图前先把页面从头滚到尾：编辑器只量视口里的行高，没滚到过的源码面板截出来行号会和代码错位（只是截图假象，读者滚动时会自动校正）。

要看的不只是「没报错」：
- 图的节点有没有叠在一起、连线文字有没有压住节点、图是否过宽（> 700）被缩得字太小；
- 演示的预览区高度是否合适，点按钮时页面会不会跳（会就加 `preview-height`）；
- 气泡内容是否过长（要滚动就该挪进正文）；
- `<dr-steps>` 逐步点一遍（或 `run-code` 里点「下一步」截图），每一步的图和 caption 对得上、图不跳；
- 深色模式下手写的颜色（图的 `fill`、页面的背景）是否还看得清。

全部 `ready`、截图看过没问题，才算写完。交付时告诉用户文件位置，以及页面里有哪些演示 / 图 / 术语解释。
