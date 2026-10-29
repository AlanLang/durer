/**
 * 落盘前 lint（`durerjs/lint`）：不开浏览器就能确定的错误，在这里一次报全。
 *
 * 每段演示源码用和运行时同一个 `compile()` 编一遍，import 和运行时同一张白名单比 —— lint 过了，
 * 浏览器里就不会因为语法和导入白屏。渲染期的错（组件抛异常、retikz 属性写错）只有浏览器知道，
 * 那一步看 `durer.ready()`。
 */
import { type DefaultTreeAdapterMap, parse } from "parse5";
import { compile } from "../compile";
import { renderMath } from "../live/math";
import { collectFiles, leadingBlankLines, type ScriptLike, type SourceFile } from "../source";
import {
  BUILTIN_MODULES,
  CODE_LANGS,
  DEMO_LAYOUTS,
  ELEMENTS,
  type ElementName,
  parseLineRanges,
  resolveLang,
  STEP_DRIVEN,
  TIP_PLACEMENTS,
} from "../spec";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
type Template = DefaultTreeAdapterMap["template"];
type TextNode = DefaultTreeAdapterMap["textNode"];

export interface LintIssue {
  level: "error" | "warning";
  /** HTML 文件里的行号，1 起算 */
  line: number;
  /** 出问题的元素：有 id 写 `#id`，否则 `<dr-react>#2` 这样的序号 */
  element: string;
  message: string;
}

const GLOBAL_ATTRIBUTES = new Set([
  "id",
  "class",
  "style",
  "hidden",
  "lang",
  "dir",
  "slot",
  "role",
  "tabindex",
  "translate",
]);

/** 包进 `<dr-tip>` 会撑坏行内排版的块级元素（`<template>` 里的不算） */
const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "div",
  "dl",
  "fieldset",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "ul",
]);

const isElement = (node: Node): node is Element => "tagName" in node;
const attr = (el: Element, name: string): string | null =>
  el.attrs.find((a) => a.name === name)?.value ?? null;
const lineOf = (node: Node): number => node.sourceCodeLocation?.startLine ?? 0;

/** 深度优先走一遍，`<template>` 的内容也走（解释气泡里的元素同样要查） */
function* walk(node: Node, insideTemplate = false): Generator<[Element, boolean]> {
  const children = "childNodes" in node ? node.childNodes : [];
  for (const child of children) {
    if (!isElement(child)) continue;
    yield [child, insideTemplate];
    if (child.tagName === "template") yield* walk((child as Template).content, true);
    else yield* walk(child, insideTemplate);
  }
}

export function lint(html: string): LintIssue[] {
  const doc = parse(html, { sourceCodeLocationInfo: true });
  const issues: LintIssue[] = [];
  const all = [...walk(doc)];
  const counts = new Map<string, number>();
  const label = (el: Element): string => {
    const id = attr(el, "id");
    if (id) return `#${id}`;
    const index = (counts.get(el.tagName) ?? 0) + 1;
    counts.set(el.tagName, index);
    return `<${el.tagName}>#${index}`;
  };
  const templateIds = new Set(
    all.filter(([el]) => el.tagName === "template").map(([el]) => attr(el, "id") ?? ""),
  );
  const registered = registeredModules(all.map(([el]) => el));

  checkRuntimeScript(
    all.map(([el]) => el),
    issues,
  );

  for (const [el, insideTemplate] of all) {
    if (!(el.tagName in ELEMENTS)) continue;
    const name = el.tagName as ElementName;
    const element = label(el);
    const report = (level: LintIssue["level"], message: string, line = lineOf(el)) =>
      issues.push({ level, line, element, message });

    checkAttributes(el, name, report);
    const parent = el.parentNode && isElement(el.parentNode) ? el.parentNode.tagName : null;
    switch (name) {
      case "dr-tip":
        checkTip(el, templateIds, report);
        break;
      case "dr-code":
        checkCode(el, report);
        break;
      case "dr-katex":
        checkKatex(el, report);
        break;
      case "dr-steps":
        checkSteps(el, report);
        break;
      case "dr-step":
        if (parent !== "dr-steps") report("error", "<dr-step> 只能直接放在 <dr-steps> 里");
        break;
      default: {
        if (name === "dr-react" && insideTemplate) {
          report("warning", "<dr-react> 不要放进解释气泡：气泡太窄，放不下源码和预览");
        }
        const files = checkLive(el, registered, report);
        const usesStep = files.some((file) => /\bstep\b/.test(file.code));
        if (parent === "dr-steps" && !usesStep) {
          report(
            "warning",
            `<${name}> 直接放在 <dr-steps> 里却没用到 step：它不会随步骤变化，想每步不同就读 step`,
          );
        }
        if (
          parent !== "dr-steps" &&
          files.some((file) => /\bprops\.step\b|\{\s*step\s*[,}]/.test(file.code))
        ) {
          report("warning", `<${name}> 读了 step，但它不在 <dr-steps> 里，step 永远是 undefined`);
        }
      }
    }
  }
  return issues.sort((a, b) => a.line - b.line);
}

type Report = (level: LintIssue["level"], message: string, line?: number) => void;

function checkRuntimeScript(elements: Element[], issues: LintIssue[]): void {
  const scripts = elements.filter(
    (el) =>
      el.tagName === "script" &&
      /\bdurerjs(@[^/]+)?\/dist\/durer\.js|\/durer\.js$/.test(attr(el, "src") ?? ""),
  );
  if (scripts.length === 0) {
    issues.push({
      level: "error",
      line: 1,
      element: "<head>",
      message:
        '没有引入运行时：在 <head> 里写 <script src="https://cdn.jsdelivr.net/npm/durerjs@<版本>/dist/durer.js"></script>',
    });
    return;
  }
  const src = attr(scripts[0] as Element, "src") ?? "";
  if (/cdn|unpkg|npm/.test(src) && !/durerjs@\d+\.\d+\.\d+/.test(src)) {
    issues.push({
      level: "warning",
      line: lineOf(scripts[0] as Element),
      element: "<script>",
      message: "运行时地址要写死完整版本号（durerjs@x.y.z）：页面是长期产物，不该跟着新版本变",
    });
  }
}

function checkAttributes(el: Element, name: ElementName, report: Report): void {
  const known = ELEMENTS[name] as readonly string[];
  for (const { name: attrName, value } of el.attrs) {
    // 元素自己的属性先认（dr-code 的 lang 和全局属性 lang 同名，取值要查）
    const own = known.includes(attrName);
    if (!own && (GLOBAL_ATTRIBUTES.has(attrName) || /^(data|aria)-/.test(attrName))) continue;
    if (!own) {
      report(
        "warning",
        known.length
          ? `<${name}> 没有 ${attrName} 属性，可用的有：${known.join("、")}`
          : `<${name}> 没有 ${attrName} 属性`,
      );
      continue;
    }
    if (attrName === "layout" && !(DEMO_LAYOUTS as readonly string[]).includes(value)) {
      report("error", `layout="${value}" 不对，只能是 ${DEMO_LAYOUTS.join(" / ")}`);
    }
    if (attrName === "placement" && !(TIP_PLACEMENTS as readonly string[]).includes(value)) {
      report("error", `placement="${value}" 不对，只能是 ${TIP_PLACEMENTS.join(" / ")}`);
    }
    if (attrName === "lang" && !resolveLang(value)) {
      report(
        "error",
        `lang="${value}" 认不出，能用的有 ${CODE_LANGS.join(" / ")}（sh、shell 也行）`,
      );
    }
    if (attrName === "interval" && !(Number(value) >= 500)) {
      report("error", `interval="${value}" 要写毫秒数，至少 500`);
    }
  }
}

/** 元素的直接子 `<script>`：parse5 节点 + 给 collectFiles 用的 ScriptLike，下标一一对应 */
function childScripts(el: Element): { nodes: Element[]; scripts: ScriptLike[] } {
  const nodes = el.childNodes.filter(
    (child): child is Element => isElement(child) && child.tagName === "script",
  );
  const scripts = nodes.map((node) => ({
    type: attr(node, "type") ?? "",
    attr: (name: string) => attr(node, name),
    text: rawText(node),
  }));
  return { nodes, scripts };
}

const rawText = (script: Element) =>
  script.childNodes
    .filter((child): child is TextNode => child.nodeName === "#text")
    .map((child) => child.value)
    .join("");

/** 源码第 n 行在 HTML 文件里是第几行 */
function htmlLine(script: Element, sourceLine: number): number {
  const first = script.childNodes[0]?.sourceCodeLocation?.startLine ?? lineOf(script);
  return first + leadingBlankLines(rawText(script)) + sourceLine - 1;
}

function misplacedSource(el: Element, expected: string): string | null {
  const misplaced = el.childNodes.find(
    (child): child is Element =>
      isElement(child) && ["template", "pre", "code", "script"].includes(child.tagName),
  );
  if (!misplaced) return null;
  const type = misplaced.tagName === "script" ? ` type="${attr(misplaced, "type") ?? ""}"` : "";
  return `要放在 <script type="${expected}"> 里，不是 <${misplaced.tagName}${type}>`;
}

/** `<dr-react>` / `<dr-retikz>`：每个文件编一遍，核对导入；返回读到的文件，供调用方再看 step */
function checkLive(el: Element, registered: Set<string>, report: Report): SourceFile[] {
  const { nodes, scripts } = childScripts(el);
  const files = collectFiles(scripts, ["script", "style"]);
  if (!files.some((file) => file.kind === "script")) {
    const misplaced = misplacedSource(el, "text/jsx");
    report(
      "error",
      misplaced
        ? `源码${misplaced}`
        : `缺少源码：在 <${el.tagName}> 里放一个 <script type="text/jsx">`,
    );
    return files;
  }
  const multi = files.length > 1;
  if (multi) checkFileNames(files, nodes, report);
  const stems = new Set(files.filter((f) => f.kind === "script").map((f) => stem(f.name)));
  const styles = new Set(
    files.filter((f) => f.kind === "style").map((f) => f.name.replace(/^\.\//, "")),
  );

  for (const file of files) {
    const node = nodes[file.index] as Element;
    const where = multi ? `${file.name}：` : "";
    const text = rawText(node);
    if (/&(lt|gt|amp|quot);/.test(text)) {
      report(
        "error",
        `${where}源码里有 HTML 转义（&lt; 之类）：<script> 里的内容原样保留，直接写 < > &`,
        lineOf(node),
      );
      continue;
    }
    if (file.kind === "style") continue;
    const compiled = compile(file.code);
    if (!compiled.ok) {
      report(
        "error",
        `${where}编译失败：${compiled.message}`,
        compiled.line ? htmlLine(node, compiled.line) : lineOf(node),
      );
      continue;
    }
    for (const mod of compiled.imports) {
      if (mod.startsWith("./")) {
        const name = mod.slice(2);
        const found = /\.css$/i.test(name) ? styles.has(name) : stems.has(stem(name));
        if (!found) {
          report(
            "error",
            `${where}找不到 "${mod}"：这个演示里的文件有 ${files.map((f) => f.name).join("、")}（用 data-file 起名）`,
            lineOf(node),
          );
        }
        continue;
      }
      if ((BUILTIN_MODULES as readonly string[]).includes(mod) || registered.has(mod)) continue;
      report(
        "error",
        `${where}不能导入 "${mod}"：页面跑在 CDN 上没有 npm，能导入的只有 ${BUILTIN_MODULES.filter((m) => m !== "react/jsx-runtime").join("、")}`,
        lineOf(node),
      );
    }
    if (el.tagName === "dr-retikz" && compiled.imports.includes("@retikz/react")) {
      report("warning", `${where}<dr-retikz> 里 retikz 组件直接可用，不用 import`, lineOf(node));
    }
  }
  const entry = files.find((file) => file.kind === "script");
  if (multi && entry && !/^\s*export\s+default\b/m.test(entry.code)) {
    report(
      "warning",
      `入口文件 ${entry.name} 要 export default 一个组件：多文件时第一个脚本文件是入口`,
    );
  }
  return files;
}

const stem = (name: string) => name.replace(/^\.\//, "").replace(/\.[^./]+$/, "");

/** 多文件：每个都要有名字，且不能重名（标签页上显示、相对导入靠它） */
function checkFileNames(files: SourceFile[], nodes: Element[], report: Report): void {
  const seen = new Set<string>();
  for (const file of files) {
    const node = nodes[file.index] as Element;
    if (!attr(node, "data-file")) {
      report(
        "warning",
        `有多个文件时每个 <script> 都写 data-file（现在显示成 ${file.name}）`,
        lineOf(node),
      );
    }
    if (seen.has(file.name)) report("error", `文件名 ${file.name} 重复了`, lineOf(node));
    seen.add(file.name);
    if (file.badLang) report("error", `data-lang="${file.badLang}" 认不出`, lineOf(node));
  }
}

function checkCode(el: Element, report: Report): void {
  const { nodes, scripts } = childScripts(el);
  const files = collectFiles(scripts, ["plain"], resolveLang(attr(el, "lang") ?? "") ?? "text");
  if (!files.length) {
    const misplaced = misplacedSource(el, "text/plain");
    report(
      "error",
      misplaced ? `代码${misplaced}` : '缺少代码：在 <dr-code> 里放一个 <script type="text/plain">',
    );
    return;
  }
  if (files.length > 1) checkFileNames(files, nodes, report);
  else if (files[0]?.badLang) report("error", `data-lang="${files[0].badLang}" 认不出`);
  files.forEach((file, i) => {
    const ranges = file.highlight ?? (i === 0 ? attr(el, "highlight") : null);
    if (!ranges) return;
    const { lines, invalid } = parseLineRanges(ranges);
    if (invalid.length)
      report("error", `highlight 里的 ${invalid.join("、")} 看不懂：写成 "3" 或 "2,4-6"`);
    const total = file.code.split("\n").length;
    const over = lines.filter((line) => line > total);
    if (over.length)
      report("warning", `highlight 的第 ${over.join("、")} 行超出了代码的 ${total} 行`);
  });
  if (el.attrs.some((a) => a.name === "diff") && !files.some((f) => /^[+-]/m.test(f.code))) {
    report("warning", "写了 diff 却没有以 + / - 开头的行");
  }
}

function checkSteps(el: Element, report: Report): void {
  const steps = el.childNodes.filter(
    (child): child is Element => isElement(child) && child.tagName === "dr-step",
  );
  if (steps.length === 0) {
    report("error", '<dr-steps> 里没有 <dr-step>：每一步写一个 <dr-step caption="…">');
    return;
  }
  if (steps.length === 1) report("warning", "只有一步，用不着 <dr-steps>");
  const driven = el.childNodes.filter(
    (child): child is Element =>
      isElement(child) && (STEP_DRIVEN as readonly string[]).includes(child.tagName),
  );
  steps.forEach((step, i) => {
    const hasContent = step.childNodes.some((child) => isElement(child) || textOf(child).trim());
    if (!attr(step, "caption")?.trim() && !hasContent) {
      report("warning", `第 ${i + 1} 个 <dr-step> 既没有 caption 也没有内容`, lineOf(step));
    }
    if (!hasContent && driven.length === 0) {
      report(
        "warning",
        `第 ${i + 1} 步只有 caption：要么在 <dr-step> 里放这一步的内容，要么放一张读 step 的图`,
        lineOf(step),
      );
    }
  });
}

function checkKatex(el: Element, report: Report): void {
  const child = el.childNodes.find(isElement);
  if (child) {
    report(
      "error",
      `公式里出现了 <${child.tagName}>：TeX 里的 < 被当成了标签，小于号写 \\lt、大于号写 \\gt`,
    );
    return;
  }
  const tex = textOf(el).trim();
  if (!tex) {
    report("error", "公式是空的：TeX 源码写在元素里面");
    return;
  }
  const result = renderMath(
    tex,
    el.attrs.some((a) => a.name === "display"),
  );
  if (!result.ok) report("error", `公式写错了：${result.message}`);
}

function checkTip(el: Element, templateIds: Set<string>, report: Report): void {
  const tip = attr(el, "tip");
  const ref = attr(el, "ref");
  const template = el.childNodes.find((child) => isElement(child) && child.tagName === "template");
  const sources = [
    tip?.trim() ? "tip" : null,
    template ? "<template>" : null,
    ref ? "ref" : null,
  ].filter(Boolean);
  if (sources.length === 0) {
    report(
      "error",
      "没有解释内容：写 tip 属性、子元素 <template>，或 ref 指向页面上的 <template id>",
    );
  } else if (sources.length > 1) {
    report("warning", `解释写了 ${sources.join(" 和 ")}，只会用 ${sources[0]}`);
  }
  if (ref && !template && !tip?.trim() && !templateIds.has(ref)) {
    report("error", `ref="${ref}" 找不到对应的 <template id="${ref}">`);
  }
  const visible = el.childNodes.filter(
    (child) => !(isElement(child) && child.tagName === "template"),
  );
  const text = visible.map(textOf).join("").trim();
  if (!text) report("error", "<dr-tip> 里没有正文文字：被解释的词写在元素里面");
  const block = visible.find((child) => isElement(child) && BLOCK_TAGS.has(child.tagName));
  if (block) {
    report(
      "warning",
      `<dr-tip> 是行内元素，里面不要放 <${(block as Element).tagName}>；解释的段落写进 <template>`,
    );
  }
}

function textOf(node: Node): string {
  if (node.nodeName === "#text") return (node as TextNode).value;
  return "childNodes" in node ? node.childNodes.map(textOf).join("") : "";
}

/** 页面脚本里 `durer.registerModule("x", …)` 挂上的模块，导入它不算错 */
function registeredModules(elements: Element[]): Set<string> {
  const names = new Set<string>();
  for (const el of elements) {
    if (el.tagName !== "script" || attr(el, "src")) continue;
    const code = el.childNodes.map(textOf).join("");
    for (const match of code.matchAll(/registerModule\(\s*(["'`])([^"'`]+)\1/g)) {
      names.add(match[2] as string);
    }
  }
  return names;
}
