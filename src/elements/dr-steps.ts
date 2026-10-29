import { STEP_DRIVEN } from "../spec";
import stepsCss from "../styles/steps.css?raw";
import tokensCss from "../styles/tokens.css?raw";
import { type ElementState, markSettled, track } from "./status";
import { whenParsed } from "./whenParsed";

const DEFAULT_INTERVAL = 3000;

/** `<dr-step>`：一步。`caption` 是这一步的说明，元素内容是这一步要显示的东西（可以没有） */
export class DrStepElement extends HTMLElement {}

interface StepTarget extends HTMLElement {
  setStep: (step: number) => void;
}

/**
 * `<dr-steps>`：分步讲解，一次显示一步，读者用按钮、圆点、方向键翻页，也可以自动播放。
 *
 * 两种用法可以混着用：每个 `<dr-step>` 里放这一步自己的内容；或者在 `<dr-steps>` 里直接放一个
 * `<dr-retikz>` / `<dr-react>`，它会收到当前的 `step`（0 起算），一张图跟着步骤变，`<dr-step>` 只写说明。
 * 所有步骤叠在同一格里，容器高度取最高的那一步：翻页时页面不跳。
 */
export class DrStepsElement extends HTMLElement {
  public state: ElementState = { state: "loading" };

  private steps: DrStepElement[] = [];
  private targets: StepTarget[] = [];
  private current = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private observer: IntersectionObserver | null = null;
  private els: {
    count: HTMLElement;
    caption: HTMLElement;
    prev: HTMLButtonElement;
    next: HTMLButtonElement;
    play: HTMLButtonElement;
    dots: HTMLElement;
    bar: HTMLElement;
  } | null = null;

  public connectedCallback(): void {
    if (this.shadowRoot) {
      this.observeVisibility();
      return;
    }
    track(this);
    whenParsed(this, () => this.init());
  }

  public disconnectedCallback(): void {
    this.stop();
    this.observer?.disconnect();
    this.observer = null;
  }

  private init(): void {
    this.steps = [...this.children].filter((el): el is DrStepElement => el.localName === "dr-step");
    this.targets = [...this.children].filter(
      (el): el is StepTarget =>
        (STEP_DRIVEN as readonly string[]).includes(el.localName) && "setStep" in el,
    );
    for (const step of this.steps) step.slot = "step";
    const shadow = this.attachShadow({ mode: "open" });
    const title = this.getAttribute("title");
    if (title !== null) {
      this.dataset.title = title;
      this.removeAttribute("title");
    }
    const hasContent = this.steps.some((step) =>
      [...step.childNodes].some(
        (node) => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim(),
      ),
    );
    shadow.innerHTML = `<style>${tokensCss}${stepsCss}</style>
      <div class="frame" part="frame">
        <div class="head" part="header"><span class="title"></span><span class="count"></span></div>
        <div class="stage" part="stage"${this.targets.length || this.hasLooseContent() ? "" : " hidden"}><slot></slot></div>
        <div class="steps" part="steps"${hasContent ? "" : " hidden"}><slot name="step"></slot></div>
        <div class="caption" part="caption" aria-live="polite"></div>
        <div class="controls" part="controls">
          <button type="button" class="nav" data-act="prev" aria-label="上一步">‹ 上一步</button>
          <div class="dots" role="group" aria-label="跳到某一步"></div>
          <button type="button" class="nav" data-act="play" aria-label="自动播放">▶ 播放</button>
          <button type="button" class="nav" data-act="next" aria-label="下一步">下一步 ›</button>
        </div>
        <div class="progress" aria-hidden="true"><i></i></div>
      </div>`;
    const $ = <T extends HTMLElement>(selector: string) => shadow.querySelector(selector) as T;
    $(".title").textContent = this.dataset.title ?? "";
    this.els = {
      count: $(".count"),
      caption: $(".caption"),
      prev: $('[data-act="prev"]'),
      next: $('[data-act="next"]'),
      play: $('[data-act="play"]'),
      dots: $(".dots"),
      bar: $(".progress i"),
    };
    if (!this.steps.length) {
      $(".controls").hidden = true;
      this.settle({
        state: "error",
        message: '<dr-steps> 里没有 <dr-step>：每一步写一个 <dr-step caption="…">',
      });
      return;
    }
    this.steps.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `第 ${index + 1} 步`);
      dot.addEventListener("click", () => {
        this.stop();
        this.go(index);
      });
      this.els?.dots.append(dot);
    });
    this.els.prev.addEventListener("click", () => {
      this.stop();
      this.go(this.current - 1);
    });
    this.els.next.addEventListener("click", () => {
      this.stop();
      this.go(this.current + 1);
    });
    this.els.play.addEventListener("click", () => (this.timer ? this.stop() : this.play()));
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    this.addEventListener("keydown", (event) => this.onKey(event));
    this.go(0);
    this.observeVisibility();
    this.settle({ state: "ready" });
  }

  /** `<dr-steps>` 里直接写的、不是 `<dr-step>` 的内容（共用的图、一段固定的说明） */
  private hasLooseContent(): boolean {
    return [...this.childNodes].some(
      (node) =>
        (node.nodeType === Node.ELEMENT_NODE && (node as Element).localName !== "dr-step") ||
        (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
    );
  }

  private go(index: number): void {
    const els = this.els;
    if (!els || !this.steps.length) return;
    const last = this.steps.length - 1;
    this.current = Math.max(0, Math.min(last, index));
    this.steps.forEach((step, i) => {
      const active = i === this.current;
      step.toggleAttribute("data-active", active);
      step.inert = !active;
      step.setAttribute("aria-hidden", String(!active));
    });
    [...els.dots.children].forEach((dot, i) => {
      if (i === this.current) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    });
    for (const target of this.targets) target.setStep(this.current);
    const caption = this.steps[this.current]?.getAttribute("caption") ?? "";
    els.caption.innerHTML = "";
    if (caption) {
      const badge = document.createElement("b");
      badge.textContent = String(this.current + 1);
      const text = document.createElement("span");
      text.textContent = caption;
      els.caption.append(badge, text);
    }
    els.count.textContent = `${this.current + 1} / ${this.steps.length}`;
    els.prev.disabled = this.current === 0;
    els.next.disabled = this.current === last;
    els.bar.style.width = `${((this.current + 1) / this.steps.length) * 100}%`;
    this.dispatchEvent(
      new CustomEvent("dr-step-change", {
        detail: { step: this.current, total: this.steps.length },
      }),
    );
  }

  private play(): void {
    if (!this.els || this.steps.length < 2) return;
    // 停在最后一步时按播放，从头开始
    if (this.current === this.steps.length - 1) this.go(0);
    const interval = Number(this.getAttribute("interval")) || DEFAULT_INTERVAL;
    this.timer = setInterval(() => {
      if (this.current >= this.steps.length - 1) this.stop();
      else this.go(this.current + 1);
    }, interval);
    this.els.play.textContent = "❚❚ 暂停";
    this.els.play.setAttribute("aria-label", "暂停");
  }

  private stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    if (this.els) {
      this.els.play.textContent = "▶ 播放";
      this.els.play.setAttribute("aria-label", "自动播放");
    }
  }

  /** `autoplay`：滚到眼前才开始播，滚走就停；系统设了减少动态效果就不自动播 */
  private observeVisibility(): void {
    if (
      !this.hasAttribute("autoplay") ||
      this.observer ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let started = false;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started) {
          started = true;
          this.play();
        } else if (!entry?.isIntersecting && this.timer) {
          this.stop();
          started = false;
        }
      },
      { threshold: 0.5 },
    );
    this.observer.observe(this);
  }

  private onKey(event: KeyboardEvent): void {
    // 只接左右和 Home / End：上下键留给页面滚动。焦点在步骤内容里的输入框上时，方向键归输入框
    if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
    const moves: Record<string, () => number> = {
      ArrowRight: () => this.current + 1,
      ArrowLeft: () => this.current - 1,
      Home: () => 0,
      End: () => this.steps.length - 1,
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    this.stop();
    this.go(move());
  }

  private settle(state: ElementState): void {
    this.state = state;
    this.dataset.state = state.state;
    markSettled(this);
  }
}
