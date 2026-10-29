import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import {
  HighlightStyle,
  type LanguageSupport,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { EditorState, type Extension } from "@codemirror/state";
import { highlightCode, type Tag, tags as t, tagHighlighter } from "@lezer/highlight";
import { basicSetup, EditorView } from "codemirror";
import { escapeHtml } from "../source";
import type { CodeLang } from "../spec";

/**
 * 编辑器和 `<dr-code>` 的静态高亮在同一个 chunk：都要 lezer 和各语言的语法，只读的图、
 * 纯文字页面用不着它。配色全走 CSS 变量（见 styles/tokens.css），跟着页面的 color-scheme 换明暗，
 * 页面也能用 `--durer-*` 自己改。
 */

/** 一张表管两处：编辑器用颜色变量，静态高亮用 class（`<dr-code>` 的样式里把 class 映射到同一组变量） */
const SYNTAX: Array<{ tags: Tag[]; cls: string; color: string; italic?: boolean }> = [
  {
    tags: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword, t.definitionKeyword],
    cls: "kw",
    color: "var(--_syn-keyword)",
  },
  {
    tags: [t.string, t.special(t.string), t.regexp, t.attributeValue],
    cls: "str",
    color: "var(--_syn-string)",
  },
  { tags: [t.number, t.bool, t.null, t.atom, t.unit], cls: "num", color: "var(--_syn-number)" },
  {
    tags: [t.comment, t.lineComment, t.blockComment],
    cls: "com",
    color: "var(--_syn-comment)",
    italic: true,
  },
  {
    tags: [t.function(t.variableName), t.function(t.propertyName), t.macroName],
    cls: "fn",
    color: "var(--_syn-function)",
  },
  {
    tags: [t.typeName, t.className, t.tagName, t.angleBracket],
    cls: "tag",
    color: "var(--_syn-tag)",
  },
  { tags: [t.attributeName, t.propertyName], cls: "attr", color: "var(--_syn-attr)" },
  { tags: [t.definition(t.variableName), t.labelName], cls: "def", color: "var(--_syn-def)" },
];

const highlightStyle = HighlightStyle.define(
  SYNTAX.map(({ tags, color, italic }) => ({
    tag: tags,
    color,
    ...(italic ? { fontStyle: "italic" } : {}),
  })),
);
const classes = tagHighlighter(SYNTAX.map(({ tags, cls }) => ({ tag: tags, class: `t-${cls}` })));

const shellLanguage = StreamLanguage.define(shell);

function support(lang: CodeLang): LanguageSupport | StreamLanguage<unknown> | null {
  switch (lang) {
    case "jsx":
    case "tsx":
    case "js":
    case "ts":
      return javascript({
        jsx: lang === "jsx" || lang === "tsx",
        typescript: lang === "ts" || lang === "tsx",
      });
    case "html":
      return html();
    case "css":
      return css();
    case "json":
      return json();
    case "bash":
      return shellLanguage;
    default:
      return null;
  }
}

/** 静态高亮：每行一段 HTML（已转义，带 `t-*` class） */
export function highlightLines(code: string, lang: CodeLang): string[] {
  const language = support(lang);
  if (!language) return code.split("\n").map(escapeHtml);
  const parser = "language" in language ? language.language.parser : language.parser;
  const lines: string[] = [""];
  highlightCode(
    code,
    parser.parse(code),
    classes,
    (text, cls) => {
      const html = escapeHtml(text);
      lines[lines.length - 1] += cls ? `<span class="${cls}">${html}</span>` : html;
    },
    () => lines.push(""),
  );
  return lines;
}

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", backgroundColor: "transparent", color: "var(--_fg)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--_mono)", lineHeight: "1.6" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--_muted)",
    border: "none",
  },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--_active-line)" },
  ".cm-cursor": { borderLeftColor: "var(--_fg)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--_selection) !important",
  },
  ".cm-matchingBracket": { backgroundColor: "var(--_selection)", outline: "none" },
  ".cm-tooltip": { backgroundColor: "var(--_surface)", border: "1px solid var(--_border)" },
});

export interface Editor {
  setValue: (value: string) => void;
  destroy: () => void;
}

export function createEditor(options: {
  parent: HTMLElement;
  root: ShadowRoot;
  value: string;
  lang: CodeLang;
  readonly: boolean;
  onChange: (value: string) => void;
}): Editor {
  const language = support(options.lang);
  const extensions: Extension[] = [
    basicSetup,
    syntaxHighlighting(highlightStyle),
    theme,
    EditorState.tabSize.of(2),
    EditorState.readOnly.of(options.readonly),
    EditorView.editable.of(!options.readonly),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange(update.state.doc.toString());
    }),
  ];
  if (language) extensions.push(language);
  const view = new EditorView({
    root: options.root,
    parent: options.parent,
    state: EditorState.create({ doc: options.value, extensions }),
  });
  return {
    setValue(value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    },
    destroy: () => view.destroy(),
  };
}
