/**
 * 页面上能写什么：元素名、属性名、可导入的模块、代码语言。
 *
 * 运行时（observedAttributes、require 白名单）和落盘前 lint（未知属性、未知导入）都读这一份，
 * 两边不会说出两套规矩。这里只放名字，不 import 任何实现 —— lint 跑在 Node 里，不该把 React 拉进来。
 */

/** 可运行的源码：放在元素里的 `<script>` 子元素，这几种 type 浏览器不会执行，原样保留 `<` `>` */
export const SOURCE_TYPES = ["text/jsx", "text/tsx"] as const;
/** `<dr-react>` 多文件时的样式文件 */
export const STYLE_TYPE = "text/css";
/** `<dr-code>` 只展示的代码 */
export const PLAIN_TYPE = "text/plain";

export const ELEMENTS = {
  "dr-react": ["title", "layout", "readonly", "preview-height", "code-height"],
  "dr-retikz": ["caption", "show-code", "readonly"],
  "dr-tip": ["tip", "ref", "placement"],
  "dr-code": ["lang", "title", "highlight", "line-numbers", "diff"],
  "dr-steps": ["title", "autoplay", "interval"],
  "dr-step": ["caption"],
  "dr-katex": ["display"],
} as const satisfies Record<string, readonly string[]>;

export type ElementName = keyof typeof ELEMENTS;

/** 能直接放进 `<dr-steps>`、跟着当前步骤重画的元素 */
export const STEP_DRIVEN = ["dr-react", "dr-retikz"] as const;

export const DEMO_LAYOUTS = ["split", "stack", "preview"] as const;
export type DemoLayout = (typeof DEMO_LAYOUTS)[number];

export const TIP_PLACEMENTS = ["top", "bottom", "left", "right"] as const;
export type TipPlacement = (typeof TIP_PLACEMENTS)[number];

/** `<dr-code>` 能高亮的语言；`bash` 也可以写 `sh` / `shell`，`text` 不高亮 */
export const CODE_LANGS = [
  "jsx",
  "tsx",
  "js",
  "ts",
  "html",
  "css",
  "json",
  "bash",
  "text",
] as const;
export type CodeLang = (typeof CODE_LANGS)[number];

const LANG_ALIASES: Record<string, CodeLang> = {
  javascript: "js",
  typescript: "ts",
  mjs: "js",
  cjs: "js",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  htm: "html",
  xml: "html",
  svg: "html",
  txt: "text",
  plain: "text",
  md: "text",
  markdown: "text",
};

/** `lang` 属性或文件扩展名 → 语言；认不出返回 null（lint 报错，运行时按纯文本显示） */
export function resolveLang(value: string): CodeLang | null {
  const key = value.trim().toLowerCase().replace(/^\./, "");
  if ((CODE_LANGS as readonly string[]).includes(key)) return key as CodeLang;
  return LANG_ALIASES[key] ?? null;
}

/** `App.tsx` → tsx；没有扩展名或认不出 → null */
export function langOfFile(name: string): CodeLang | null {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? null : resolveLang(name.slice(dot + 1));
}

/**
 * `highlight="2,4-6"` → [2, 4, 5, 6]。写错的片段（`a`、`6-4`、`0`）进 `invalid`，
 * 运行时跳过、lint 报出来。
 */
export function parseLineRanges(value: string): { lines: number[]; invalid: string[] } {
  const lines = new Set<number>();
  const invalid: string[] = [];
  for (const part of value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)) {
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    const from = Number(match?.[1]);
    const to = Number(match?.[2] ?? match?.[1]);
    if (!match || from < 1 || to < from) {
      invalid.push(part);
      continue;
    }
    for (let line = from; line <= to; line += 1) lines.add(line);
  }
  return { lines: [...lines].sort((a, b) => a - b), invalid };
}

/**
 * 演示代码里 `import` 得到的模块。演示是写给读者看的真实代码，所以要显式 import，
 * 不往作用域里偷塞 React；但只能从这几个里取 —— 页面跑在 CDN 上，没有 npm 可装。
 * 多文件演示之间用相对路径互相 import（`./utils`）。页面脚本可以用 `durer.registerModule()` 再挂别的。
 */
export const BUILTIN_MODULES = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@retikz/react",
  "@retikz/core",
] as const;
