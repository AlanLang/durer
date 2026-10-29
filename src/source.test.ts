import { expect, test } from "bun:test";
import { collectFiles, dedent, leadingBlankLines, type ScriptLike, unescapeScript } from "./source";

const script = (type: string, text: string, attrs: Record<string, string> = {}): ScriptLike => ({
  type,
  text,
  attr: (name) => attrs[name] ?? null,
});

test("dedent 去掉首尾空行和公共缩进，保留相对缩进", () => {
  expect(dedent("\n      a\n        b\n\n      c\n    ")).toBe("a\n  b\n\nc");
});

test("tab 按两个空格算", () => {
  expect(dedent("\t\tx\n\t\t\ty")).toBe("x\n  y");
});

test("leadingBlankLines 数开头的空行", () => {
  expect(leadingBlankLines("\n  \nx\n")).toBe(2);
  expect(leadingBlankLines("x")).toBe(0);
});

test("<\\/script> 还原成 </script>，别的反斜杠不动", () => {
  expect(unescapeScript('<script src="x"><\\/script> a\\nb')).toBe(
    '<script src="x"></script> a\\nb',
  );
});

test("collectFiles 按 type 挑文件，名字和语言有默认值", () => {
  const files = collectFiles(
    [
      script("text/jsx", "\n  export default () => <p />;\n"),
      script("text/css", ".a {}", { "data-file": "app.css" }),
      script("module", "ignored"),
      script("text/tsx", "export const x = 1;"),
    ],
    ["script", "style"],
  );
  expect(files.map((f) => [f.name, f.kind, f.lang, f.index])).toEqual([
    ["App.jsx", "script", "jsx", 0],
    ["app.css", "style", "css", 1],
    ["file3.tsx", "script", "tsx", 3],
  ]);
  expect(files[0]?.code).toBe("export default () => <p />;");
});

test("collectFiles 的语言：data-lang > 文件扩展名 > 元素上的 lang", () => {
  const files = collectFiles(
    [
      script("text/plain", "a", { "data-lang": "sh" }),
      script("text/plain", "b", { "data-file": "x.json" }),
      script("text/plain", "c"),
      script("text/plain", "d", { "data-lang": "cobol" }),
    ],
    ["plain"],
    "html",
  );
  expect(files.map((f) => f.lang)).toEqual(["bash", "json", "html", "html"]);
  expect(files[3]?.badLang).toBe("cobol");
});
