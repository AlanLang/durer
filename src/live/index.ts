/**
 * live chunk：React、retikz、sucrase 都在这里，入口 chunk 动态 import 它。
 * 只放 `<dr-tip>` / `<dr-code>` / `<dr-katex>` 的页面不用下载这一大块。
 */
import type { ComponentType } from "react";
import { compile } from "../compile";
import type { SourceFile } from "../source";
import { type CompiledFile, evaluate } from "./evaluate";
import { RETIKZ_SCOPE } from "./modules";

export { mount } from "./render";

export type Build =
  | { ok: true; component: ComponentType<Record<string, unknown>> }
  | { ok: false; message: string };

/**
 * 编译 + 求值，任一步失败都给一条能直接显示给读者的错误。多文件时报错前面带上文件名。
 * 第一个脚本文件是入口；样式文件不在这里处理。
 */
export function build(files: SourceFile[], withRetikz: boolean): Build {
  const scripts = files.filter((file) => file.kind === "script");
  const prefix = (file: SourceFile) => (files.length > 1 ? `${file.name}：` : "");
  const compiled: CompiledFile[] = [];
  for (const file of scripts) {
    const result = compile(file.code);
    if (!result.ok) return { ok: false, message: prefix(file) + result.message };
    compiled.push({ name: file.name, code: result.code });
  }
  try {
    return { ok: true, component: evaluate(compiled, withRetikz ? RETIKZ_SCOPE : {}) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
