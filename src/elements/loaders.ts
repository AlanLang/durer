/**
 * 按需下载的 chunk，每个只下载一次。地址跟着 durer.js 自己走（rsbuild 的 assetPrefix: auto），
 * 从哪个 CDN 引入运行时，chunk 就从哪取。
 */
type EditorChunk = typeof import("../live/editor");
type MathChunk = typeof import("../live/math");

let editor: Promise<EditorChunk> | null = null;
/** CodeMirror + 各语言语法：编辑器和 `<dr-code>` 的静态高亮共用 */
export const loadEditor = (): Promise<EditorChunk> => {
  editor ??= import(/* webpackChunkName: "editor" */ "../live/editor");
  return editor;
};

let math: Promise<MathChunk> | null = null;
/** KaTeX：`<dr-katex>` 用 */
export const loadMath = (): Promise<MathChunk> => {
  math ??= import(/* webpackChunkName: "math" */ "../live/math");
  return math;
};
