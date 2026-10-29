/**
 * `build:types` 的第二步：把 src/authoring.md 作为注释拼到 dist/durer.d.ts 顶部。
 * AI 只读这一个文件：先读怎么写，再读每个元素的属性说明。版本号替换成当前版本，示例里的 CDN 地址就是能用的。
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const guide = readFileSync(path.join(root, "src/authoring.md"), "utf8").replaceAll(
  "{{VERSION}}",
  version,
);
const file = path.join(root, "dist/durer.d.ts");
const dts = readFileSync(file, "utf8");

if (guide.includes("*/")) throw new Error("authoring.md 里不能出现 */，会提前结束 d.ts 顶部的注释");
const banner = `/**\n * durer ${version}\n *\n${guide
  .trimEnd()
  .split("\n")
  .map((line) => (line ? ` * ${line}` : " *"))
  .join("\n")}\n */\n\n`;
writeFileSync(file, banner + dts);
