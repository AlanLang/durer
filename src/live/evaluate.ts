import type { ComponentType } from "react";
import { getModule, hasModule, moduleNames } from "../registry";

/** 一个编好的文件：名字给相对导入认，代码是 `compile()` 产出的 CommonJS */
export interface CompiledFile {
  name: string;
  code: string;
}

/**
 * 跑编好的文件，拿到入口文件默认导出的组件。
 *
 * 多文件演示之间用相对路径互相 import（`./utils`、`./utils.js` 都行），每个文件只跑一次；
 * 导入 `.css` 是空操作 —— 样式文件由元素自己挂进演示画面。`scope` 里的名字直接可用
 * （`<dr-retikz>` 的 retikz 组件）。作者代码外面再包一层块：否则作者自己写 `const Node = ...`
 * 会和同名参数撞，报「Identifier has already been declared」。
 */
export function evaluate(
  files: CompiledFile[],
  scope: Record<string, unknown> = {},
): ComponentType<Record<string, unknown>> {
  const [entry] = files;
  if (!entry) throw new Error("没有可运行的文件");
  const names = Object.keys(scope);
  const cache = new Map<CompiledFile, Record<string, unknown>>();
  const loading = new Set<CompiledFile>();

  const run = (file: CompiledFile): Record<string, unknown> => {
    const cached = cache.get(file);
    if (cached) return cached;
    if (loading.has(file)) throw new Error(`${file.name} 和别的文件互相 import 成了环`);
    loading.add(file);
    const module = { exports: {} as Record<string, unknown> };
    const fn = new Function("require", "exports", "module", ...names, `{\n${file.code}\n}`);
    fn(
      (spec: string) => requireFrom(spec, files, run),
      module.exports,
      module,
      ...names.map((name) => scope[name]),
    );
    loading.delete(file);
    cache.set(file, module.exports);
    return module.exports;
  };

  const component = run(entry).default;
  if (typeof component !== "function" && typeof component !== "object") {
    throw new Error("默认导出不是 React 组件：写 `export default function App() { ... }`");
  }
  return component as ComponentType<Record<string, unknown>>;
}

const stem = (name: string) => name.replace(/^\.\//, "").replace(/\.[^./]+$/, "");

function requireFrom(
  spec: string,
  files: CompiledFile[],
  run: (file: CompiledFile) => Record<string, unknown>,
): unknown {
  if (spec.startsWith("./")) {
    if (/\.css$/i.test(spec)) return {};
    const file = files.find((f) => stem(f.name) === stem(spec));
    if (!file) {
      throw new Error(
        `找不到 "${spec}"：这个演示里的文件有 ${files.map((f) => f.name).join("、")}`,
      );
    }
    return { __esModule: true, ...run(file) };
  }
  if (!hasModule(spec)) {
    throw new Error(`不能导入 "${spec}"，可用的模块：${moduleNames().join("、")}`);
  }
  const mod = getModule(spec) as Record<string, unknown>;
  // sucrase 的 interop 看 __esModule：带上它，`import React from "react"` 和
  // `import * as React` 拿到的都是同一个对象
  if (mod && typeof mod === "object" && !("__esModule" in mod)) {
    return { __esModule: true, default: "default" in mod ? mod.default : mod, ...mod };
  }
  return mod;
}
