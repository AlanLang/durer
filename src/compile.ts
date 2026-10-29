import { transform } from "sucrase";

/**
 * 把演示源码编成一段 CommonJS 代码，运行时和 lint 共用这一份：lint 能编过的，浏览器里就编得过。
 *
 * 源码有两种写法：
 * - **模块**：有 import / export 语句，默认导出就是要渲染的组件（`<dr-react>` 的常态）；
 * - **表达式**：没有 import / export，整段是一个 JSX 表达式，直接画出来（`<dr-retikz>` 的常态）。
 *   编译时包成 `export default function DurerRoot({ step }) { return (...) }`，行号往回挪一行；
 *   放在 `<dr-steps>` 里时表达式能直接读 `step`（当前第几步，0 起算）。
 */

export interface CompileOk {
  ok: true;
  code: string;
  /** 源码里 import 的模块名，按出现顺序去重 */
  imports: string[];
}

export interface CompileError {
  ok: false;
  message: string;
  /** 1 起算，对应作者写的源码（已扣掉表达式包装的那一行） */
  line?: number;
  column?: number;
}

export type CompileResult = CompileOk | CompileError;

/** 有任何一行以 import / export 开头就是模块（多文件演示里的工具文件只有具名导出） */
const MODULE_SYNTAX = /^\s*(import|export)\b/m;

export function isModuleSource(source: string): boolean {
  return MODULE_SYNTAX.test(source);
}

export function compile(source: string): CompileResult {
  const asModule = isModuleSource(source);
  if (!asModule && !source.trim()) return { ok: false, message: "源码是空的" };
  // 包装只占一行，后面的行号和作者写的一一对应
  const wrapped = asModule
    ? source
    : `export default function DurerRoot({ step }) { return (\n${source}\n); }`;
  const offset = asModule ? 0 : 1;
  try {
    const { code } = transform(wrapped, {
      transforms: ["jsx", "typescript", "imports"],
      jsxRuntime: "automatic",
      production: true,
    });
    return { ok: true, code, imports: collectImports(code) };
  } catch (error) {
    return toCompileError(error, offset, source.split("\n").length);
  }
}

/**
 * sucrase 的报错形如 `Unexpected token (3:5)`，行号在消息里，自己抠出来再扣掉包装行。
 * 标签没闭合时解析器要读到表达式包装的收尾才发现，行号会落在源码之外，收回到最后一行。
 */
function toCompileError(error: unknown, offset: number, lines: number): CompileError {
  const raw = error instanceof Error ? error.message : String(error);
  const match = /\((\d+):(\d+)\)\s*$/.exec(raw);
  if (!match) return { ok: false, message: raw };
  const reported = Number(match[1]) - offset;
  const line = Math.min(lines, Math.max(1, reported));
  const text = raw.slice(0, match.index).trim();
  // 收回来的行号上，原来的列号没有意义
  if (line !== reported) return { ok: false, message: `${text}（第 ${line} 行附近）`, line };
  const column = Number(match[2]) + 1;
  return { ok: false, message: `${text}（第 ${line} 行第 ${column} 列）`, line, column };
}

/** 编完的 CommonJS 里每个 import 都成了 `require("x")`，从产物里取比解析源码可靠 */
function collectImports(code: string): string[] {
  const names = new Set<string>();
  for (const match of code.matchAll(/\brequire\((["'])([^"']+)\1\)/g)) {
    names.add(match[2] as string);
  }
  return [...names];
}
