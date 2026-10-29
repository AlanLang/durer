/**
 * `.husky/commit-msg` 调这个：`node scripts/commit-msg.cli.mjs <message 文件>`。
 * 入口薄到没有逻辑，规则和测试都在 commit-msg.mjs。
 */
import { readFileSync } from "node:fs";
import { checkCommitMessage, emojiTable, subjectOf } from "./commit-msg.mjs";

const message = readFileSync(process.argv[2], "utf8");
const result = checkCommitMessage(message);
if (!result.ok) {
  console.error(`husky - commit message 不合规：${result.reason}\n`);
  console.error(`  ${subjectOf(message) || "（空）"}\n`);
  console.error("  要求 <emoji> <描述>，emoji 写字符或 :shortcode: 都行，例：");
  console.error("    ✨ 新增 dr-tip 的嵌套气泡");
  console.error("    :bug: 修复编辑器行号错位\n");
  console.error(
    `  可用的 emoji（https://gist.github.com/parmentf/035de27d6ed1dce0b36a）：\n${emojiTable()}`,
  );
  process.exit(1);
}
