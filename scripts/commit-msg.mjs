/**
 * commit message 规矩：主题行 `<emoji> <描述>`，emoji 取自
 * https://gist.github.com/parmentf/035de27d6ed1dce0b36a ，不用 feat: / fix: 这类英文前缀。
 *
 *   ✨ 新增 dr-tip 的嵌套气泡
 *   🐛 修复编辑器行号错位
 *   :books: 补充 retikz 写法说明
 *
 * emoji 写字符或 `:shortcode:` 都行。规则全在这里，`.husky/commit-msg` 只负责调用。
 */

/** [emoji, shortcode, 含义]，顺序照 gist */
export const EMOJIS = [
  ["🎉", "tada", "初始提交"],
  ["🔖", "bookmark", "版本标签"],
  ["✨", "sparkles", "新功能"],
  ["🐛", "bug", "修 bug"],
  ["📇", "card_index", "元数据"],
  ["📚", "books", "文档"],
  ["💡", "bulb", "代码注释"],
  ["🐎", "racehorse", "性能"],
  ["💄", "lipstick", "样式 / 外观"],
  ["🚨", "rotating_light", "测试"],
  ["✅", "white_check_mark", "新增测试"],
  ["✔️", "heavy_check_mark", "让测试通过"],
  ["⚡", "zap", "一般更新"],
  ["🎨", "art", "改进格式 / 结构"],
  ["🔨", "hammer", "重构"],
  ["🔥", "fire", "删除代码 / 文件"],
  ["💚", "green_heart", "CI"],
  ["🔒", "lock", "安全"],
  ["⬆️", "arrow_up", "升级依赖"],
  ["⬇️", "arrow_down", "降级依赖"],
  ["👕", "shirt", "lint"],
  ["👽", "alien", "翻译"],
  ["📝", "pencil", "文案"],
  ["🚑", "ambulance", "紧急修复"],
  ["🚀", "rocket", "部署 / 发布"],
  ["🍎", "apple", "修 macOS 上的问题"],
  ["🐧", "penguin", "修 Linux 上的问题"],
  ["🏁", "checkered_flag", "修 Windows 上的问题"],
  ["🚧", "construction", "进行中"],
  ["👷", "construction_worker", "搭 CI 构建"],
  ["📈", "chart_with_upwards_trend", "统计 / 埋点"],
  ["➖", "heavy_minus_sign", "移除依赖"],
  ["➕", "heavy_plus_sign", "新增依赖"],
  ["🐳", "whale", "Docker"],
  ["🔧", "wrench", "配置文件"],
  ["📦", "package", "package.json"],
  ["🔀", "twisted_rightwards_arrows", "合并分支"],
  ["💩", "hankey", "待改进的代码"],
  ["⏪", "rewind", "回退改动"],
  ["💥", "boom", "破坏性变更"],
  ["👌", "ok_hand", "按评审意见修改"],
  ["♿", "wheelchair", "无障碍"],
  ["🚚", "truck", "移动 / 重命名"],
];

/**
 * ✔️ ⬆️ ⬇️ 带不带 U+FE0F（变体选择符）全看输入法，两种都要认。
 * 比较前统一去掉它。
 */
const bare = (text) => text.replaceAll("️", "");

const BY_CHAR = new Map(EMOJIS.map(([emoji]) => [bare(emoji), emoji]));
const BY_CODE = new Map(EMOJIS.map(([emoji, code]) => [code, emoji]));

/** git 自己生成的主题行，以及 `--fixup` / `--squash` 的产物，不拦 */
const GENERATED = /^(Merge |Revert |fixup! |squash! |amend! )/;

/** 英文类型前缀：emoji 已经表达了类型，再写一遍就是两套规矩 */
const TYPE_PREFIX =
  /^(feat|feature|fix|bugfix|hotfix|docs?|style|refactor|perf|test|build|ci|chore|revert)(\([^)]*\))?!?\s*[:：]/i;

/** 只看主题行：git 要到之后才剥掉注释行，钩子拿到的文件里还带着它们 */
export function subjectOf(message) {
  const line = message
    .split("\n")
    .map((l) => l.trimEnd())
    .find((l) => l.trim() && !l.startsWith("#"));
  return line ?? "";
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkCommitMessage(message) {
  const subject = subjectOf(message);
  if (!subject) return { ok: false, reason: "提交说明是空的" };
  if (GENERATED.test(subject)) return { ok: true };

  let rest;
  const code = /^:([a-z0-9_+-]+):/.exec(subject);
  if (code) {
    if (!BY_CODE.has(code[1])) return { ok: false, reason: `:${code[1]}: 不在可用的 emoji 里` };
    rest = subject.slice(code[0].length);
  } else {
    const first = bare(subject).match(/^\p{Extended_Pictographic}/u)?.[0];
    if (!first) {
      return TYPE_PREFIX.test(subject)
        ? {
            ok: false,
            reason: "不用 feat: / fix: 这类前缀，换成对应的 emoji（✨ 新功能、🐛 修 bug …）",
          }
        : { ok: false, reason: "主题行要以 emoji 开头" };
    }
    if (!BY_CHAR.has(first)) return { ok: false, reason: `${first} 不在可用的 emoji 里` };
    rest = bare(subject).slice(first.length);
  }

  if (!/^ \S/.test(rest)) return { ok: false, reason: "emoji 后面空一格再写描述" };
  const description = rest.trim();
  if (TYPE_PREFIX.test(description)) {
    return { ok: false, reason: "emoji 已经说明了类型，描述前面不要再写 feat: / fix:" };
  }
  return { ok: true };
}

/** 报错时列给提交的人看 */
export function emojiTable() {
  const width = Math.max(...EMOJIS.map(([, code]) => code.length)) + 2;
  return EMOJIS.map(
    ([emoji, code, meaning]) => `  ${emoji}  ${`:${code}:`.padEnd(width)} ${meaning}`,
  ).join("\n");
}
