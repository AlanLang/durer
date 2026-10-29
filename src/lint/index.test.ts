import { describe, expect, test } from "bun:test";
import { lint } from "./index";

const page = (
  body: string,
  head = '<script src="https://cdn.jsdelivr.net/npm/durerjs@0.1.0/dist/durer.js"></script>',
) => `<!doctype html>\n<html>\n<head>${head}</head>\n<body>\n${body}\n</body>\n</html>`;

const messages = (html: string) => lint(html).map((issue) => `${issue.level}:${issue.message}`);

describe("运行时引入", () => {
  test("没引入运行时报错", () => {
    expect(messages(page("", ""))[0]).toContain("没有引入运行时");
  });

  test("CDN 地址没写死版本提醒", () => {
    const issues = lint(
      page("", '<script src="https://cdn.jsdelivr.net/npm/durerjs/dist/durer.js"></script>'),
    );
    expect(issues[0]?.level).toBe("warning");
  });
});

describe("演示源码", () => {
  test("正常的演示没有问题", () => {
    const html = page(`<dr-react title="x">
  <script type="text/jsx">
    import { useState } from "react";
    export default function App() { return <p>{useState(1)[0]}</p>; }
  </script>
</dr-react>`);
    expect(lint(html)).toEqual([]);
  });

  test("编译报错的行号对回 HTML 文件", () => {
    const html = page(`<dr-retikz>
  <script type="text/jsx">
    <Layout>
      <Node id="a">
    </Layout>
  </script>
</dr-retikz>`);
    const [issue] = lint(html);
    expect(issue?.level).toBe("error");
    // page() 前面占 4 行，</Layout> 在第 9 行
    expect(issue?.line).toBe(9);
  });

  test("导入白名单之外的模块报错；页面注册过的放过", () => {
    const demo = `<dr-react><script type="text/jsx">
import x from "lodash";
export default () => <p>{x}</p>;
</script></dr-react>`;
    expect(messages(page(demo))[0]).toContain('不能导入 "lodash"');
    const registered = `<script>durer.registerModule("lodash", window._)</script>${demo}`;
    expect(lint(page(registered))).toEqual([]);
  });

  test("源码放错地方、转义了、缺了都报出来", () => {
    expect(messages(page("<dr-react><pre>x</pre></dr-react>"))[0]).toContain("不是 <pre>");
    expect(messages(page('<dr-react><script type="module">x</script></dr-react>'))[0]).toContain(
      'type="module"',
    );
    expect(
      messages(page('<dr-react><script type="text/jsx">&lt;p/&gt;</script></dr-react>'))[0],
    ).toContain("HTML 转义");
    expect(messages(page("<dr-retikz></dr-retikz>"))[0]).toContain("缺少源码");
  });

  test("dr-retikz 里多余的 retikz import 提醒", () => {
    const html = page(`<dr-retikz><script type="text/jsx">
import { Layout } from "@retikz/react";
export default () => <Layout />;
</script></dr-retikz>`);
    expect(messages(html)).toEqual(["warning:<dr-retikz> 里 retikz 组件直接可用，不用 import"]);
  });
});

describe("属性", () => {
  test("未知属性和非法取值", () => {
    const html = page(
      '<dr-react layout="grid" heading="x"><script type="text/jsx"><p /></script></dr-react>',
    );
    const result = messages(html);
    expect(result).toContain('error:layout="grid" 不对，只能是 split / stack / preview');
    expect(result.some((m) => m.includes("没有 heading 属性"))).toBe(true);
  });

  test("全局属性、data-*、aria-* 不算未知", () => {
    const html = page('<dr-tip id="t" class="c" data-x="1" aria-label="y" tip="解释">词</dr-tip>');
    expect(lint(html)).toEqual([]);
  });

  test("placement 取值", () => {
    expect(messages(page('<dr-tip tip="a" placement="up">词</dr-tip>'))[0]).toContain("placement");
  });
});

describe("dr-tip", () => {
  test("三种解释写法都认", () => {
    const html = page(`<p><dr-tip tip="一句">a</dr-tip>
<dr-tip>b<template><p>富文本</p></template></dr-tip>
<dr-tip ref="c">c</dr-tip></p>
<template id="c"><p>共用</p></template>`);
    expect(lint(html)).toEqual([]);
  });

  test("没写解释、ref 找不到、没有正文都报错", () => {
    expect(messages(page("<dr-tip>词</dr-tip>"))[0]).toContain("没有解释内容");
    expect(messages(page('<dr-tip ref="nope">词</dr-tip>'))[0]).toContain('ref="nope" 找不到');
    expect(messages(page('<dr-tip tip="x"></dr-tip>'))[0]).toContain("没有正文文字");
  });

  test("写了两种解释、包了块级元素提醒", () => {
    expect(messages(page('<dr-tip tip="x">词<template>y</template></dr-tip>'))[0]).toContain(
      "只会用 tip",
    );
    expect(messages(page('<div><dr-tip tip="x"><div>词</div></dr-tip></div>'))[0]).toContain(
      "不要放 <div>",
    );
  });

  test("气泡里的元素同样检查；dr-react 放进气泡提醒", () => {
    const html = page(`<dr-tip>词<template>
<dr-tip>嵌套</dr-tip>
<dr-react><script type="text/jsx"><p /></script></dr-react>
</template></dr-tip>`);
    const result = messages(html);
    expect(result.some((m) => m.includes("没有解释内容"))).toBe(true);
    expect(result.some((m) => m.includes("不要放进解释气泡"))).toBe(true);
  });
});

describe("多文件 dr-react", () => {
  const demo = (files: string) => page(`<dr-react>\n${files}\n</dr-react>`);

  test("相对导入能找到文件、css 文件；正常没有问题", () => {
    const html = demo(`<script type="text/jsx" data-file="App.jsx">
import { x } from "./utils";
import "./style.css";
export default () => <p>{x}</p>;
</script>
<script type="text/jsx" data-file="utils.js">export const x = 1;</script>
<script type="text/css" data-file="style.css">p { color: red; }</script>`);
    expect(lint(html)).toEqual([]);
  });

  test("相对导入找不到、文件重名、没写 data-file", () => {
    const result = messages(
      demo(`<script type="text/jsx" data-file="App.jsx">import { y } from "./nope";
export default () => <p>{y}</p>;</script>
<script type="text/jsx" data-file="App.jsx">export const z = 1;</script>
<script type="text/jsx">export const w = 1;</script>`),
    );
    expect(result.some((m) => m.includes('找不到 "./nope"'))).toBe(true);
    expect(result.some((m) => m.includes("文件名 App.jsx 重复了"))).toBe(true);
    expect(result.some((m) => m.includes("每个 <script> 都写 data-file"))).toBe(true);
  });

  test("报错带文件名，行号对到出错的那个文件", () => {
    const html =
      demo(`<script type="text/jsx" data-file="App.jsx">export default () => <p />;</script>
<script type="text/jsx" data-file="utils.js">
export const broken = (;
</script>`);
    const [issue] = lint(html);
    expect(issue?.message).toStartWith("utils.js：编译失败");
    expect(issue?.line).toBe(8);
  });

  test("入口文件没有默认导出提醒", () => {
    const html = demo(`<script type="text/jsx" data-file="utils.js">export const x = 1;</script>
<script type="text/css" data-file="a.css">p {}</script>`);
    expect(messages(html).some((m) => m.includes("入口文件 utils.js 要 export default"))).toBe(
      true,
    );
  });
});

describe("dr-code", () => {
  test("正常的单文件、多文件没有问题", () => {
    expect(
      lint(
        page(
          '<dr-code lang="html" highlight="1"><script type="text/plain"><p>hi</p></script></dr-code>',
        ),
      ),
    ).toEqual([]);
    expect(
      lint(
        page(`<dr-code>
<script type="text/plain" data-file="a.js">1</script>
<script type="text/plain" data-file="b.css">2</script>
</dr-code>`),
      ),
    ).toEqual([]);
  });

  test("代码放错地方、语言认不出、highlight 写错或越界", () => {
    expect(messages(page("<dr-code><pre>x</pre></dr-code>"))[0]).toContain(
      '要放在 <script type="text/plain"> 里，不是 <pre>',
    );
    expect(messages(page('<dr-code><script type="text/jsx">x</script></dr-code>'))[0]).toContain(
      '不是 <script type="text/jsx">',
    );
    expect(
      messages(page('<dr-code lang="cobol"><script type="text/plain">x</script></dr-code>'))[0],
    ).toContain('lang="cobol" 认不出');
    const result = messages(
      page('<dr-code highlight="a,5"><script type="text/plain">one\ntwo</script></dr-code>'),
    );
    expect(result.some((m) => m.includes("highlight 里的 a 看不懂"))).toBe(true);
    expect(result.some((m) => m.includes("第 5 行超出了代码的 2 行"))).toBe(true);
  });

  test("diff 没有 +/- 行提醒", () => {
    expect(
      messages(page('<dr-code diff><script type="text/plain">a\nb</script></dr-code>'))[0],
    ).toContain("写了 diff");
  });
});

describe("dr-steps", () => {
  test("每步有内容，或者一张读 step 的图配 caption，都没有问题", () => {
    expect(
      lint(
        page(
          '<dr-steps><dr-step caption="一">a</dr-step><dr-step caption="二">b</dr-step></dr-steps>',
        ),
      ),
    ).toEqual([]);
    expect(
      lint(
        page(`<dr-steps>
<dr-retikz><script type="text/jsx"><Layout><Node id="a" position={[0, 0]} opacity={step ? 1 : 0.3}>A</Node></Layout></script></dr-retikz>
<dr-step caption="一"></dr-step><dr-step caption="二"></dr-step>
</dr-steps>`),
      ),
    ).toEqual([]);
  });

  test("没有 dr-step、只有一步、dr-step 放错地方", () => {
    expect(messages(page("<dr-steps><p>x</p></dr-steps>"))[0]).toContain("里没有 <dr-step>");
    expect(messages(page('<dr-steps><dr-step caption="一">a</dr-step></dr-steps>'))).toContain(
      "warning:只有一步，用不着 <dr-steps>",
    );
    expect(messages(page('<div><dr-step caption="x">a</dr-step></div>'))).toContain(
      "error:<dr-step> 只能直接放在 <dr-steps> 里",
    );
  });

  test("步骤里只有 caption 又没有图、图不读 step、不在 dr-steps 里却读 step", () => {
    expect(
      messages(
        page(
          '<dr-steps><dr-step caption="一"></dr-step><dr-step caption="二"></dr-step></dr-steps>',
        ),
      )[0],
    ).toContain("只有 caption");
    const noStep = page(`<dr-steps>
<dr-retikz><script type="text/jsx"><Layout /></script></dr-retikz>
<dr-step caption="一"></dr-step><dr-step caption="二"></dr-step>
</dr-steps>`);
    expect(messages(noStep).some((m) => m.includes("却没用到 step"))).toBe(true);
    const outside = page(
      '<dr-react><script type="text/jsx">export default ({ step }) => <p>{step}</p>;</script></dr-react>',
    );
    expect(messages(outside)[0]).toContain("不在 <dr-steps> 里");
  });

  test("interval 要是毫秒数", () => {
    expect(
      messages(
        page(
          '<dr-steps interval="2s"><dr-step caption="一">a</dr-step><dr-step caption="二">b</dr-step></dr-steps>',
        ),
      )[0],
    ).toContain('interval="2s"');
  });
});

describe("dr-katex", () => {
  test("正确的公式没有问题", () => {
    expect(
      lint(
        page(
          "<p><dr-katex>\\frac{a}{b} \\lt 1</dr-katex></p><dr-katex display>E = mc^2</dr-katex>",
        ),
      ),
    ).toEqual([]);
  });

  test("公式写错、空、< 被当成标签", () => {
    expect(messages(page("<dr-katex>\\frac{1}{</dr-katex>"))[0]).toContain("公式写错了");
    expect(messages(page("<dr-katex> </dr-katex>"))[0]).toContain("公式是空的");
    expect(messages(page("<dr-katex>a <b</dr-katex>"))[0]).toContain("小于号写 \\lt");
  });
});
