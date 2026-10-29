import { BUILTIN_MODULES } from "./spec";

/**
 * 演示代码 `import` 时查的表。放在入口 chunk：页面脚本在 React 那一大块下载完之前就能
 * `durer.registerModule()`；内置模块由 live chunk 加载时补进来。
 */
const modules = new Map<string, unknown>();

export function registerModule(name: string, mod: unknown): void {
  if (!name) throw new Error("durer.registerModule：模块名不能为空");
  modules.set(name, mod);
}

export function hasModule(name: string): boolean {
  return modules.has(name);
}

export function getModule(name: string): unknown {
  return modules.get(name);
}

/** 内置模块在前，页面注册的在后，报错时列给作者看 */
export function moduleNames(): string[] {
  const extra = [...modules.keys()].filter(
    (name) => !(BUILTIN_MODULES as readonly string[]).includes(name),
  );
  return [...BUILTIN_MODULES, ...extra];
}
