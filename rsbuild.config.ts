import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, rspack } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

const VERSION: string = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "package.json"), "utf8"),
).version;

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: { durer: "./src/index.ts" },
    define: { __DURER_VERSION__: JSON.stringify(VERSION) },
  },
  output: {
    target: "web",
    distPath: { root: "dist", js: "", css: "" },
    // 异步 chunk 跟着运行时自己的地址走（document.currentScript），不是页面的地址：
    // 页面从 CDN 引入 durer.js，live / editor chunk 也要从同一个 CDN 目录取
    assetPrefix: "auto",
    // CDN 地址里已经带版本号，文件名不再带 hash：页面写死的 <script src> 才稳定
    filenameHash: false,
    filename: { js: "[name].js" },
    legalComments: "none",
  },
  performance: {
    // 入口只出一个文件；live（React + retikz + 编译器）和 editor（CodeMirror）各自一个异步 chunk
    chunkSplit: { strategy: "all-in-one" },
  },
  tools: {
    // 样例页是手写的（examples/，dev 下当静态目录），不由 rsbuild 生成
    htmlPlugin: false,
    rspack: {
      plugins: [
        new rspack.BannerPlugin({
          banner: `durer ${VERSION}`,
          entryOnly: true,
          stage: rspack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
        }),
      ],
    },
  },
  server: {
    port: 5190,
    publicDir: { name: "examples", copyOnBuild: false },
  },
  dev: {
    assetPrefix: "auto",
    lazyCompilation: false,
  },
});
