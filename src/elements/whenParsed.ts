/**
 * 元素在解析途中就会被升级、connectedCallback 先于它的子元素到来 —— 这时读 `<script>` 子元素只能读到空。
 * 文档还在解析就等 DOMContentLoaded；已经解析完的（脚本插入、innerHTML）等一个微任务，
 * 让同步追加子元素的写法也读得到。
 */
export function whenParsed(el: Element, callback: () => void): void {
  const run = () => {
    if (el.isConnected) callback();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    queueMicrotask(run);
  }
}
