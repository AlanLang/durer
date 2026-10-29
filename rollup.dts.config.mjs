/**
 * 类型产物：src/public.ts → dist/durer.d.ts（给写页面的 AI 读，之后拼上 authoring.md），
 * src/lint/index.ts → dist/lint.d.ts（给在 Node 里调 lint 的程序用）。
 * CSS 是运行时副作用，类型里用不上，一律外部化。
 */
import { dts } from "rollup-plugin-dts";

const external = (id) => id.endsWith(".css") || id.endsWith(".css?raw") || !/^[./]/.test(id);

export default [
  {
    input: "src/public.ts",
    output: { file: "dist/durer.d.ts", format: "es" },
    external,
    plugins: [dts()],
  },
  {
    input: "src/lint/index.ts",
    output: { file: "dist/lint.d.ts", format: "es" },
    external,
    plugins: [dts()],
  },
];
