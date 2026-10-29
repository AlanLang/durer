import katex from "katex";

/**
 * math chunk：只有 KaTeX。输出走 MathML —— 浏览器原生排版，不用字体文件、不用样式表，
 * 放进 shadow DOM 也能用（KaTeX 的 HTML 输出依赖 @font-face，shadow root 里定义的字体不生效）。
 */
export type MathResult = { ok: true; html: string } | { ok: false; message: string };

export function renderMath(tex: string, display: boolean): MathResult {
  try {
    return {
      ok: true,
      html: katex.renderToString(tex, {
        displayMode: display,
        output: "mathml",
        throwOnError: true,
        strict: "ignore",
      }),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.replace(/^KaTeX parse error:\s*/, "") : String(error);
    return { ok: false, message };
  }
}
