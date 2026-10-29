# durer

AI 写的讲解型 HTML 的运行时。页面用一个 `<script>` 引入，就能用这几个元素：

| 元素 | 作用 |
|---|---|
| `<dr-react>` | 可编辑的 React 演示，改完立即生效；支持多文件（`data-file`） |
| `<dr-retikz>` | 用 retikz 的 JSX 画示意图 |
| `<dr-tip>` | 悬停 / 聚焦 / 轻点弹出解释气泡 |
| `<dr-code>` | 只展示的代码：高亮、行高亮、diff、多文件 |
| `<dr-steps>` / `<dr-step>` | 分步讲解；里面的 `<dr-retikz>` / `<dr-react>` 读当前 `step` |
| `<dr-katex>` | TeX 公式（KaTeX → MathML） |

页面的排版、配色、叙事全归 AI 自己写的 HTML / CSS；durer 只补 HTML 做不到、或手写容易错的部分。
tab、折叠、卡片、布局这类 HTML / CSS 能做的不加元素。

名字：项目和仓库叫 durer（AlanLang/durer），**npm 包名是 `durerjs`**（`durer` 被 npm 拒了），
产物文件名 `durer.js`、全局 `window.durer`、CSS 变量 `--durer-*` 不变。

## 产物

- `dist/durer.js`：运行时入口（~20 KB gzip）。重的部分按需加载：`async/live.js`（React、retikz、sucrase）、
  `async/editor.js`（CodeMirror 和各语言语法，编辑器和 `<dr-code>` 共用）、`async/math.js`（KaTeX）。
  chunk 地址跟着 `durer.js` 自己走，从任何 CDN / 子路径引入都能找到。
- `dist/durer.d.ts`：给写页面的 AI 读的接口，`src/authoring.md`（编写指导）拼在 `src/public.ts` 生成的声明顶部。
- `dist/lint.js`：落盘前校验（`durerjs/lint`）。
- `skills/durer-html/`：Claude Code skill。`references/durer.d.ts`、`references/retikz.d.ts`、`scripts/lint.mjs`
  是 build 同步进来的产物，**不要手改**，改源码后 build 再一起提交（CI 会核对）。

## 代码结构

| 位置 | 内容 |
|---|---|
| `src/spec.ts` | 元素名、属性、可导入模块、代码语言：**运行时和 lint 共用的唯一一份**，只放名字不 import 实现 |
| `src/source.ts` / `src/compile.ts` | 从 `<script>` 子元素读文件、sucrase 编译，运行时和 lint 共用 |
| `src/elements/` | 各元素（Web Components + shadow DOM）；`live-block.ts` 是 dr-react / dr-retikz 的公共部分 |
| `src/live/` | 按需 chunk 的内容：求值、React 渲染、编辑器与静态高亮、KaTeX |
| `src/lint/` | Node 侧校验 |
| `src/public.ts`、`src/authoring.md` | AI 读的接口说明和编写指导 |
| `examples/` | dev 页面，也是 GitHub Pages 展示站：`index.html` 展示页，`elements.html`、`retikz.html` 核对页 |

## 开发

技术栈和 lewitt 一致：Bun、TypeScript、Rsbuild、Biome。

```bash
bun install
bun run dev      # http://localhost:5190/ ，examples/ 当静态目录
bun run check    # biome + tsc + 单测 + build（build 顺带同步 skill）
```

- 改接口（元素、属性、模块、语言）时一起看：`spec.ts`、`public.ts`、`authoring.md`、`src/lint/`、对应测试，
  以及 `examples/elements.html`。
- `authoring.md` 里每条 retikz 写法都要在 `examples/retikz.html` 里真画出来核对过，retikz 的属性别凭印象写。
- 涉及渲染的改动要在浏览器里验：打开页面，`await durer.ready()` 看每个元素是不是 `ready`；
  截长图前先把页面滚一遍（编辑器只量视口里的行高）。
- 示例页用相对路径（`./durer.js`），Pages 在 `/durer/` 子路径下。
- 代码注释、文档、报错文案用中文，报错要具体到能照着改。

## 提交与发布

- 提交说明：`<emoji> <描述>`，emoji 取自 `scripts/commit-msg.mjs` 的列表（✨ 新功能、🐛 修 bug、📚 文档、🔨 重构、🔧 配置…），
  不写 `feat:` / `fix:`。`.husky/commit-msg` 会拦。
- 推到 `main`：`.github/workflows/pages.yml` 跑 check 后发布展示页到 https://alanlang.github.io/durer/ 。
- 发版：`npm version patch|minor|major` → `git push --follow-tags`。`version` 脚本会重新 build 并把 skill 一起提交；
  `.github/workflows/release.yml` 发现 npm 上没有这个版本就跑 check、用 trusted publishing（OIDC，不用 token）发布，
  再建 GitHub Release。不在本地 `npm publish`（账号 2FA 是浏览器通行证密钥）。
