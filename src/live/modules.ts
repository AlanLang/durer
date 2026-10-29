import * as RetikzCore from "@retikz/core";
import * as Retikz from "@retikz/react";
import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import { hasModule, registerModule } from "../registry";
import type { BUILTIN_MODULES } from "../spec";

const BUILTINS: Record<(typeof BUILTIN_MODULES)[number], unknown> = {
  react: React,
  "react/jsx-runtime": JsxRuntime,
  "react-dom": ReactDOM,
  "react-dom/client": ReactDOMClient,
  "@retikz/react": Retikz,
  "@retikz/core": RetikzCore,
};

/** 页面先注册了同名模块就以页面的为准（比如想换一份带补丁的 retikz） */
for (const [name, mod] of Object.entries(BUILTINS)) {
  if (!hasModule(name)) registerModule(name, mod);
}

/**
 * `<dr-retikz>` 里不用 import 就能用的名字：retikz 的组件（Layout / Node / Draw …），
 * 加上写 way 时离不开的 `DrawWay`（它在 core 里，react 包没有转出）
 */
export const RETIKZ_SCOPE: Record<string, unknown> = {
  ...Object.fromEntries(Object.entries(Retikz).filter(([name]) => /^[A-Z][A-Za-z]*$/.test(name))),
  DrawWay: RetikzCore.DrawWay,
};
