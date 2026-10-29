import { describe, expect, test } from "bun:test";
import { compile, isModuleSource } from "./compile";

describe("compile", () => {
  test("模块写法：默认导出原样保留，import 记下来", () => {
    const result = compile(
      'import { useState } from "react";\nexport default function App() { return <p>{useState(0)[0]}</p>; }',
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.imports).toEqual(["react/jsx-runtime", "react"]);
  });

  test("表达式写法：包成默认导出的组件", () => {
    const result = compile('<Layout>\n  <Node id="a" position={[0, 0]}>A</Node>\n</Layout>');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.code).toContain("DurerRoot");
  });

  test("表达式写法的报错行号扣掉包装那一行", () => {
    const result = compile('<Layout>\n  <Node id="a">\n</Layout>');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.line).toBe(3);
  });

  test("模块写法的报错行号就是源码行号", () => {
    const result = compile("const a = 1;\nexport default () => <p>{a</p>;");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBe(2);
      expect(result.message).toContain("第 2 行");
    }
  });

  test("TypeScript 类型标注能编过", () => {
    expect(
      compile("export default function A({ n }: { n: number }) { return <b>{n}</b>; }").ok,
    ).toBe(true);
  });

  test("空源码直接报错", () => {
    expect(compile("  \n ")).toEqual({ ok: false, message: "源码是空的" });
  });

  test("export default 只认行首", () => {
    expect(isModuleSource("// export default 只是注释里提到\n<p />")).toBe(false);
    expect(isModuleSource("  export default App;")).toBe(true);
  });
});
