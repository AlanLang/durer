import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "../compile";
import { registerModule } from "../registry";
import { evaluate } from "./evaluate";
import { RETIKZ_SCOPE } from "./modules";

const run = (source: string, scope?: Record<string, unknown>) => {
  const compiled = compile(source);
  if (!compiled.ok) throw new Error(compiled.message);
  return renderToStaticMarkup(
    createElement(evaluate([{ name: "App.jsx", code: compiled.code }], scope)),
  );
};

const runFiles = (files: Record<string, string>, props: Record<string, unknown> = {}) => {
  const compiled = Object.entries(files).map(([name, source]) => {
    const result = compile(source);
    if (!result.ok) throw new Error(result.message);
    return { name, code: result.code };
  });
  return renderToStaticMarkup(createElement(evaluate(compiled), props));
};

test("默认导入和命名导入拿到同一个 React", () => {
  const html = run(`import React, { useState } from "react";
export default function A() { const [n] = useState(React.version ? 1 : 0); return <i>{n}</i>; }`);
  expect(html).toBe("<i>1</i>");
});

test("作者自己声明和作用域同名的变量不冲突", () => {
  expect(run('const Node = "mine";\nexport default () => <b>{Node}</b>;', RETIKZ_SCOPE)).toBe(
    "<b>mine</b>",
  );
});

test("retikz 组件和 DrawWay 在作用域里", () => {
  expect(RETIKZ_SCOPE.Layout).toBeDefined();
  expect(RETIKZ_SCOPE.Draw).toBeDefined();
  expect(RETIKZ_SCOPE.DrawWay).toBeDefined();
  const svg = run('<Layout><Node id="a" position={[0, 0]}>A</Node></Layout>', RETIKZ_SCOPE);
  expect(svg).toStartWith("<svg");
});

test("导入没有的模块，报错里列出能用的", () => {
  expect(() => run('import x from "lodash";\nexport default () => <p>{x}</p>;')).toThrow(
    /不能导入 "lodash"，可用的模块：react/,
  );
});

test("页面注册的模块能导入", () => {
  registerModule("greet", { hello: (name: string) => `你好 ${name}` });
  expect(run('import { hello } from "greet";\nexport default () => <p>{hello("durer")}</p>;')).toBe(
    "<p>你好 durer</p>",
  );
});

test("默认导出不是组件时说清楚该怎么写", () => {
  expect(() => run("export default 42;")).toThrow(/默认导出不是 React 组件/);
});

test("多文件：相对导入（带不带扩展名都行），导入 css 是空操作", () => {
  const html = runFiles({
    "App.jsx":
      'import { twice } from "./utils";\nimport { NAME } from "./const.js";\nimport "./style.css";\nexport default () => <p>{twice(2)} {NAME}</p>;',
    "utils.js": "export const twice = (n) => n * 2;",
    "const.js": 'export const NAME = "durer";',
  });
  expect(html).toBe("<p>4 durer</p>");
});

test("多文件：每个文件只跑一次", () => {
  const html = runFiles({
    "App.jsx":
      'import { count } from "./a";\nimport { again } from "./b";\nexport default () => <p>{count} {again}</p>;',
    "a.js":
      "globalThis.__runs = (globalThis.__runs ?? 0) + 1;\nexport const count = globalThis.__runs;",
    "b.js": 'import { count } from "./a";\nexport const again = count;',
  });
  expect(html).toBe("<p>1 1</p>");
});

test("多文件：找不到的文件、循环导入都说清楚", () => {
  expect(() =>
    runFiles({ "App.jsx": 'import x from "./nope";\nexport default () => <p>{x}</p>;' }),
  ).toThrow(/找不到 "\.\/nope"：这个演示里的文件有 App.jsx/);
  expect(() =>
    runFiles({
      "App.jsx": 'import { a } from "./a";\nexport default () => <p>{a}</p>;',
      "a.js": 'import { b } from "./b";\nexport const a = b;',
      "b.js": 'import { a } from "./a";\nexport const b = a;',
    }),
  ).toThrow(/互相 import 成了环/);
});

test("表达式写法能读到 step，模块写法从 props 拿", () => {
  expect(runFiles({ "App.jsx": "<b>第 {step} 步</b>" }, { step: 2 })).toBe("<b>第 2 步</b>");
  expect(runFiles({ "App.jsx": "export default ({ step }) => <b>{step}</b>;" }, { step: 1 })).toBe(
    "<b>1</b>",
  );
});
