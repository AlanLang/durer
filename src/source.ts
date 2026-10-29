import {
  type CodeLang,
  langOfFile,
  PLAIN_TYPE,
  resolveLang,
  SOURCE_TYPES,
  STYLE_TYPE,
} from "./spec";

/**
 * 源码写在 HTML 里会跟着页面缩进，首尾还常带空行。编辑器里要给读者看的是一份干净的代码，
 * 所以去掉首尾空行和公共缩进；行内的相对缩进原样保留。
 */
export function dedent(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").split("\n");
  while (lines.length && !lines[0]?.trim()) lines.shift();
  while (lines.length && !lines.at(-1)?.trim()) lines.pop();
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => (/^ */.exec(line) as RegExpExecArray)[0].length);
  const common = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(common).trimEnd()).join("\n");
}

/** dedent 去掉了开头几行空行：lint 要靠它把编译报错的行号对回 HTML 文件 */
export function leadingBlankLines(text: string): number {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let count = 0;
  while (count < lines.length && !lines[count]?.trim()) count += 1;
  return count;
}

/**
 * `<script>` 里不能出现字面的 `</script>`（会提前结束脚本），讲 HTML 的代码却常要写它。
 * 约定写成 `<\/script>`，读出来时还原。
 */
export function unescapeScript(text: string): string {
  return text.replace(/<\\\/(script)/gi, "</$1");
}

/** 代码当文字塞进 innerHTML 前转义（编辑器的静态高亮和 `<dr-code>` 都用） */
export const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 运行时的 DOM 元素和 lint 的 parse5 节点，都先变成这个样子再交给 `collectFiles` */
export interface ScriptLike {
  type: string;
  attr: (name: string) => string | null;
  text: string;
}

export type FileKind = "script" | "style" | "plain";

export interface SourceFile {
  /** `data-file` 写的文件名；没写时给一个默认名（单文件时不显示） */
  name: string;
  kind: FileKind;
  lang: CodeLang;
  /** 去掉缩进、还原 `<\/script>` 之后的代码 */
  code: string;
  /** `data-highlight` 原文 */
  highlight: string | null;
  /** `data-lang` 写了但认不出（lint 报错用） */
  badLang: string | null;
  /** 在 `collectFiles` 输入里的下标，lint 用来找回行号 */
  index: number;
}

const kindOf = (type: string): FileKind | null => {
  const t = type.trim().toLowerCase();
  if ((SOURCE_TYPES as readonly string[]).includes(t)) return "script";
  if (t === STYLE_TYPE) return "style";
  if (t === PLAIN_TYPE) return "plain";
  return null;
};

/**
 * 从元素的 `<script>` 子元素里挑出文件。`accept` 决定认哪些：
 * `<dr-react>` / `<dr-retikz>` 认 jsx、tsx、css，`<dr-code>` 只认 text/plain。
 * `fallbackLang` 是元素上的 `lang`，给没写 `data-lang`、文件名也看不出语言的那份用。
 */
export function collectFiles(
  scripts: ScriptLike[],
  accept: readonly FileKind[],
  fallbackLang: CodeLang = "text",
): SourceFile[] {
  const files: SourceFile[] = [];
  scripts.forEach((script, index) => {
    const kind = kindOf(script.type);
    if (!kind || !accept.includes(kind)) return;
    const name = script.attr("data-file");
    const declared = script.attr("data-lang");
    const lang =
      (declared ? resolveLang(declared) : null) ??
      (name ? langOfFile(name) : null) ??
      (kind === "style"
        ? "css"
        : kind === "script"
          ? defaultScriptLang(script.type)
          : fallbackLang);
    files.push({
      name: name || defaultName(kind, lang, files.length),
      kind,
      lang,
      code: unescapeScript(dedent(script.text)),
      highlight: script.attr("data-highlight"),
      badLang: declared && !resolveLang(declared) ? declared : null,
      index,
    });
  });
  return files;
}

const defaultScriptLang = (type: string): CodeLang =>
  type.trim().toLowerCase() === "text/tsx" ? "tsx" : "jsx";

function defaultName(kind: FileKind, lang: CodeLang, position: number): string {
  if (kind === "style") return position === 0 ? "style.css" : `style${position + 1}.css`;
  const ext = lang === "text" ? "txt" : lang === "bash" ? "sh" : lang;
  return position === 0 ? `App.${ext}` : `file${position + 1}.${ext}`;
}

/** 运行时：元素的 `<script>` 子元素 → ScriptLike */
export function scriptsOf(host: Element): ScriptLike[] {
  return [...host.children]
    .filter((el) => el.localName === "script")
    .map((el) => ({
      type: el.getAttribute("type") ?? "",
      attr: (name: string) => el.getAttribute(name),
      text: el.textContent ?? "",
    }));
}
