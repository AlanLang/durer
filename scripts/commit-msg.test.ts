import { describe, expect, test } from "bun:test";
import { checkCommitMessage, EMOJIS, subjectOf } from "./commit-msg.mjs";

const ok = (message: string) => expect(checkCommitMessage(message)).toEqual({ ok: true });
const reason = (message: string) => {
  const result = checkCommitMessage(message);
  expect(result.ok).toBe(false);
  return result.ok ? "" : result.reason;
};

describe("通过", () => {
  test("emoji 字符 + 描述", () => {
    ok("✨ 新增 dr-tip 的嵌套气泡");
    ok("🐛 修复编辑器行号错位");
  });

  test(":shortcode: + 描述", () => {
    ok(":sparkles: 新增 dr-tip 的嵌套气泡");
    ok(":heavy_check_mark: 让 lint 测试通过");
  });

  test("带不带变体选择符都认（✔️ ⬆️ ⬇️）", () => {
    ok("✔️ 让测试通过");
    ok("✔ 让测试通过");
    ok("⬆️ 升级 retikz");
    ok("⬆ 升级 retikz");
  });

  test("gist 里每一个 emoji 都能用", () => {
    for (const [emoji, code] of EMOJIS) {
      ok(`${emoji} 描述`);
      ok(`:${code}: 描述`);
    }
  });

  test("只看主题行：注释行、正文、署名都不管", () => {
    ok(
      "# Please enter the commit message\n\n✨ 新功能\n\nfeat: 正文里随便写\n\nCo-Authored-By: x <y@z>",
    );
  });

  test("git 生成的主题行放过", () => {
    ok("Merge branch 'dev'");
    ok('Revert "✨ 新功能"');
    ok("fixup! ✨ 新功能");
    ok("squash! 🐛 修复");
    ok("amend! 🐛 修复");
  });
});

describe("拦下", () => {
  test("英文类型前缀", () => {
    expect(reason("feat: 新增嵌套气泡")).toContain("不用 feat: / fix:");
    expect(reason("fix(lint): 修复行号")).toContain("不用 feat: / fix:");
    expect(reason("feature: 新功能")).toContain("不用 feat: / fix:");
  });

  test("emoji 后面又写了类型前缀", () => {
    expect(reason("✨ feat: 新增嵌套气泡")).toContain("不要再写 feat: / fix:");
    expect(reason(":bug: fix: 修复")).toContain("不要再写");
  });

  test("没有 emoji", () => {
    expect(reason("新增嵌套气泡")).toBe("主题行要以 emoji 开头");
  });

  test("不在列表里的 emoji", () => {
    expect(reason("😀 心情不错")).toContain("不在可用的 emoji 里");
    expect(reason(":smile: 心情不错")).toContain("不在可用的 emoji 里");
  });

  test("emoji 后面没空格或没有描述", () => {
    expect(reason("✨新功能")).toBe("emoji 后面空一格再写描述");
    expect(reason("✨")).toBe("emoji 后面空一格再写描述");
    expect(reason(":sparkles:")).toBe("emoji 后面空一格再写描述");
  });

  test("空说明", () => {
    expect(reason("# 只有注释\n\n")).toBe("提交说明是空的");
  });
});

test("subjectOf 跳过开头的空行和注释", () => {
  expect(subjectOf("\n# c\n  \n🐛 修复\n正文")).toBe("🐛 修复");
});
