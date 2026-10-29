/**
 * GitHub Pages 的站点：examples/ 的页面 + 运行时产物，放进 site/。先跑 `bun run build`。
 *
 * 页面用相对路径引 `./durer.js`，dev 下由 rsbuild 从同一个根目录给出，这里照搬同一个布局：
 * 运行时、按需 chunk（async/）和页面放在一层。d.ts 也带上，AI 能直接从站点读接口。
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const site = path.join(root, "site");

if (!existsSync(path.join(dist, "durer.js"))) {
  throw new Error("dist/durer.js 不存在：先跑 bun run build");
}
rmSync(site, { recursive: true, force: true });
mkdirSync(site);
for (const file of readdirSync(path.join(root, "examples"))) {
  if (file.endsWith(".html")) cpSync(path.join(root, "examples", file), path.join(site, file));
}
cpSync(path.join(dist, "durer.js"), path.join(site, "durer.js"));
cpSync(path.join(dist, "durer.d.ts"), path.join(site, "durer.d.ts"));
cpSync(path.join(dist, "async"), path.join(site, "async"), { recursive: true });
// 不让 Pages 走 Jekyll：文件原样发布
writeFileSync(path.join(site, ".nojekyll"), "");
