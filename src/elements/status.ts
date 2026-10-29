/**
 * 页面上每个 durer 元素的状态，供 `durer.diagnostics()` / `durer.ready()` 读：
 * AI 写完页面在浏览器里验一遍时，不用截图猜哪块坏了。
 */
export type ElementState =
  | { state: "loading" }
  | { state: "ready" }
  | { state: "error"; message: string };

export interface Tracked extends HTMLElement {
  state: ElementState;
}

export interface Diagnostic {
  /** 元素标签名 */
  tag: string;
  /** 元素的 id；没写 id 时是它在同类元素里的序号，如 `dr-react#2` */
  ref: string;
  state: ElementState["state"];
  message?: string;
}

const tracked = new Set<Tracked>();
const waiters = new Set<() => void>();

export function track(el: Tracked): void {
  tracked.add(el);
}

export function markSettled(_el: Tracked): void {
  if (pending() === 0) {
    for (const resolve of waiters) resolve();
    waiters.clear();
  }
}

function live(): Tracked[] {
  return [...tracked].filter((el) => el.isConnected);
}

function pending(): number {
  return live().filter((el) => el.state.state === "loading").length;
}

export function diagnostics(): Diagnostic[] {
  const counts = new Map<string, number>();
  return live().map((el) => {
    const tag = el.localName;
    const index = (counts.get(tag) ?? 0) + 1;
    counts.set(tag, index);
    const { state } = el.state;
    const message = el.state.state === "error" ? el.state.message : undefined;
    return { tag, ref: el.id || `${tag}#${index}`, state, ...(message ? { message } : {}) };
  });
}

/** 等页面上所有元素都画完（或报错）；`timeout` 毫秒后不再等，照当时的状态返回 */
export function ready(timeout = 10_000): Promise<Diagnostic[]> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      waiters.delete(done);
      resolve(diagnostics());
    };
    const timer = setTimeout(done, timeout);
    // 元素在 DOMContentLoaded 之后才开始干活，先等一拍再看有没有在途的
    requestAnimationFrame(() => {
      if (pending() === 0) done();
      else waiters.add(done);
    });
  });
}
