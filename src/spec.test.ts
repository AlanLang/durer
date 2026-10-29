import { expect, test } from "bun:test";
import { langOfFile, parseLineRanges, resolveLang } from "./spec";

test("parseLineRanges 认单行和区间，去重排序，写错的单独列出", () => {
  expect(parseLineRanges("4, 2-3,3")).toEqual({ lines: [2, 3, 4], invalid: [] });
  expect(parseLineRanges("a, 6-4, 0, 1")).toEqual({ lines: [1], invalid: ["a", "6-4", "0"] });
});

test("resolveLang / langOfFile 认别名和扩展名", () => {
  expect(resolveLang("Shell")).toBe("bash");
  expect(resolveLang(".tsx")).toBe("tsx");
  expect(resolveLang("cobol")).toBeNull();
  expect(langOfFile("App.mjs")).toBe("js");
  expect(langOfFile("Makefile")).toBeNull();
});
