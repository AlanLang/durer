/**
 * `node lint.js <页面.html> [...] [--json]`：逐个文件报问题，有 error 时退出码 1。
 * 入口薄到没有分支以外的逻辑，规则都在 index.ts。
 */
import { readFileSync } from "node:fs";
import { type LintIssue, lint } from "./index";

const args = process.argv.slice(2);
const json = args.includes("--json");
const files = args.filter((arg) => !arg.startsWith("--"));

if (files.length === 0) {
  console.error("用法：node lint.js <页面.html> [...] [--json]");
  process.exit(2);
}

let failed = false;
const results: Record<string, LintIssue[]> = {};
for (const file of files) {
  const issues = lint(readFileSync(file, "utf8"));
  results[file] = issues;
  if (issues.some((issue) => issue.level === "error")) failed = true;
}

if (json) {
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} else {
  for (const [file, issues] of Object.entries(results)) {
    if (issues.length === 0) {
      process.stdout.write(`${file}：没有问题\n`);
      continue;
    }
    for (const { level, line, element, message } of issues) {
      process.stdout.write(
        `${file}:${line}  ${level === "error" ? "错误" : "提醒"}  ${element}  ${message}\n`,
      );
    }
  }
}
process.exit(failed ? 1 : 0);
