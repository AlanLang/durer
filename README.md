# durer

**展示页：<https://alanlang.github.io/durer/>**（各元素核对页：[elements.html](https://alanlang.github.io/durer/elements.html)，
retikz 写法核对页：[retikz.html](https://alanlang.github.io/durer/retikz.html)）

AI 写的讲解型 HTML 的运行时。页面用一个 `<script>` 引入，就能用这几个元素：

| 元素 | 作用 |
|---|---|
| `<dr-react>` | 渲染 React 组件，旁边是可编辑的源码，改完立即生效 |
| `<dr-retikz>` | 用 [retikz](https://github.com/Pionpill/retikz) 的 JSX 画示意图，可选展开源码 |
| `<dr-tip>` | 正文里的词，悬停 / 聚焦 / 轻点弹出解释气泡，支持富文本、共用解释和嵌套 |
| `<dr-code>` | 只展示的代码：语法高亮、行高亮、diff、多文件标签页、复制 |
| `<dr-steps>` / `<dr-step>` | 分步讲解：翻页、方向键、自动播放；里面的 `<dr-retikz>` / `<dr-react>` 能读当前 `step` |
| `<dr-katex>` | TeX 公式，KaTeX 排成浏览器原生 MathML，行内或 `display` 块级 |

```html
<script src="https://cdn.jsdelivr.net/npm/durer@0.1.0/dist/durer.js"></script>
```

## 产物

| 文件 | 给谁 |
|---|---|
| `dist/durer.js` | 页面引入的运行时入口（~20 KB gzip）。React + retikz + 编译器在 `async/live.js`，CodeMirror 和各语言语法在 `async/editor.js`（编辑器、`<dr-code>` 高亮共用），KaTeX 在 `async/math.js`，用到才下载，地址跟着 `durer.js` 自己走 |
| `dist/durer.d.ts` | 写页面的 AI 读的接口：顶部是 `src/authoring.md` 编写指导，后面是元素属性和 `window.durer` |
| `dist/lint.js` | `import { lint } from "durer/lint"`：落盘前校验，和运行时共用编译器与白名单 |
| `skills/durer-html/` | Claude Code skill：SKILL.md + 同步进来的 `durer.d.ts`、`retikz.d.ts`、`lint.mjs` |

## 开发

技术栈和 lewitt 一致：Bun、TypeScript、Rsbuild、Biome。

```bash
bun install
bun run dev          # http://localhost:5190/ ，样例页在 examples/（/elements.html 核对各元素，/retikz.html 核对 retikz 写法）
bun run check        # biome + tsc + 单测 + build（build 会把 d.ts 和 lint 同步进 skill）
```

改接口时这几处一起看：`src/spec.ts`（元素名、属性、模块白名单，运行时和 lint 共用）、`src/public.ts`（d.ts 里的属性说明）、
`src/authoring.md`（编写指导）、`src/lint/`。authoring.md 里每一条 retikz 写法都要在 `examples/retikz.html` 里画出来核对过。

提交说明：主题行写 `<emoji> <描述>`，不用 `feat:` / `fix:` 前缀，emoji 取自
[这份约定](https://gist.github.com/parmentf/035de27d6ed1dce0b36a)，写字符或 `:shortcode:` 都行。
`.husky/commit-msg` 会检查，规则和完整的 emoji 表在 `scripts/commit-msg.mjs`。常用的几个：

| emoji | 用于 |
|---|---|
| ✨ `:sparkles:` | 新功能 |
| 🐛 `:bug:` | 修 bug |
| 📚 `:books:` | 文档 |
| 🔨 `:hammer:` | 重构 |
| 💄 `:lipstick:` | 样式 / 外观 |
| ✅ `:white_check_mark:` | 新增测试 |
| 🔧 `:wrench:` | 配置文件 |
| ⬆️ `:arrow_up:` | 升级依赖 |

展示页由 `.github/workflows/pages.yml` 发布：推到 `main` 后先跑 `bun run check`，通过了再 `bun run build:site`
（examples/ 的页面 + 运行时产物 → `site/`）发到 GitHub Pages。

安装 skill：`ln -s "$PWD/skills/durer-html" ~/.claude/skills/durer-html`
