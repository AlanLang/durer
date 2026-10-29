/**
 * build 的最后一步：把 AI 要读的 d.ts 和 lint 命令同步进 skill 目录，skill 自带一份、不依赖本仓。
 * 两份都是产物，不要手改；改 src/authoring.md、src/public.ts 或 lint 源码后重新 build。
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const skill = path.join(root, "skills/durer-html");
mkdirSync(path.join(skill, "references"), { recursive: true });
mkdirSync(path.join(skill, "scripts"), { recursive: true });
copyFileSync(path.join(root, "dist/durer.d.ts"), path.join(skill, "references/durer.d.ts"));
copyFileSync(path.join(root, "dist/lint-cli.js"), path.join(skill, "scripts/lint.mjs"));

/**
 * retikz 组件的属性说明，原样摘自它的类型声明：authoring.md 只列常用写法，
 * AI 要用表里没有的属性时查这一份，不靠猜。引用到的 IR 类型名不展开，读注释就够。
 */
const retikz = path.join(root, "node_modules/@retikz/react/dist/types");
const RETIKZ_FILES = [
  "kernel/runtime/Layout.d.ts",
  "kernel/components/Node.d.ts",
  "sugar/path/Draw.d.ts",
  "kernel/components/Scope.d.ts",
  "kernel/components/Text.d.ts",
  "sugar/shapes/Circle.d.ts",
  "sugar/shapes/Rectangle.d.ts",
  "sugar/shapes/Ellipse.d.ts",
  "sugar/shapes/Arc.d.ts",
  "sugar/shapes/Grid.d.ts",
];
const { version: retikzVersion } = JSON.parse(
  readFileSync(path.join(root, "node_modules/@retikz/react/package.json"), "utf8"),
);
const sections = RETIKZ_FILES.map((file) => {
  const body = readFileSync(path.join(retikz, file), "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("import ") && !line.startsWith("//# sourceMappingURL"))
    .join("\n")
    .trim();
  return `// ---- ${file} ----\n${body}`;
});
writeFileSync(
  path.join(skill, "references/retikz.d.ts"),
  `// @retikz/react ${retikzVersion} 的组件属性（摘自其类型声明，build 时生成，不要手改）\n\n${sections.join("\n\n")}\n`,
);
