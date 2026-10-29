import { arrow, autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { TIP_PLACEMENTS, type TipPlacement } from "../spec";
import bubbleCss from "../styles/bubble.css?raw";
import termCss from "../styles/term.css?raw";
import tokensCss from "../styles/tokens.css?raw";
import { type ElementState, markSettled, track } from "./status";
import { whenParsed } from "./whenParsed";

/** 指针扫过不算：停一下才弹，免得读正文时满屏乱跳 */
const OPEN_DELAY = 120;
/** 从词挪到气泡上要经过一段空隙，留出这段时间不关 */
const CLOSE_DELAY = 200;

let counter = 0;

/**
 * 气泡挂在 body 上，不在词的 DOM 里：正文容器的 overflow / transform 管不到它。
 * 支持 popover 的浏览器还会进顶层，盖过页面上任何 z-index。
 * 内容放在气泡的 light DOM 里，页面的样式（code、strong、链接）照常作用。
 */
export class DrBubbleElement extends HTMLElement {
  public owner: DrTipElement | null = null;

  public connectedCallback(): void {
    if (this.shadowRoot) return;
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${tokensCss}${bubbleCss}</style><div class="box" part="box"><slot></slot></div><div class="arrow" part="arrow"></div>`;
  }
}

/**
 * `<dr-tip>`：一段正文，悬停 / 聚焦 / 轻点时弹出解释气泡。
 *
 * 解释从三处取，按顺序找第一个有的：`tip` 属性（纯文本）、子元素 `<template>`（富文本）、
 * `ref` 指向页面上的 `<template id>`（同一个术语多处出现时只写一份）。
 * 气泡里还可以再放 `<dr-tip>`：指针在子气泡上时，父气泡不会关。
 */
export class DrTipElement extends HTMLElement {
  public state: ElementState = { state: "loading" };

  private bubble: DrBubbleElement | null = null;
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private stopAutoUpdate: (() => void) | null = null;
  /** 开着的子气泡：只要还有，就不关自己 */
  private readonly children_ = new Set<DrTipElement>();
  private hovering = false;
  private focused = false;
  private openedAt = 0;
  /** 在气泡里按下（点链接、选字）会让词失焦，这一下不算离开 */
  private pressedInside = false;

  public connectedCallback(): void {
    if (this.shadowRoot) return;
    track(this);
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>${tokensCss}${termCss}</style><slot></slot>`;
    if (!this.hasAttribute("tabindex")) this.tabIndex = 0;
    this.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") this.enter();
    });
    this.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "touch") this.leave();
    });
    this.addEventListener("click", () => {
      // 触屏没有悬停，靠轻点开关。鼠标点下去时 focus 已经把它打开了，这一下不该又关上
      if (!this.isOpen()) this.open();
      else if (Date.now() - this.openedAt > 400) this.close();
    });
    this.addEventListener("focus", () => {
      this.focused = true;
      this.open();
    });
    this.addEventListener("blur", () => {
      this.focused = false;
      if (this.pressedInside) {
        this.pressedInside = false;
        return;
      }
      this.scheduleClose();
    });
    this.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen()) {
        event.stopPropagation();
        this.close();
      }
    });
    whenParsed(this, () => this.check());
  }

  public disconnectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.close();
        this.bubble?.remove();
        this.bubble = null;
      }
    });
  }

  /** 没写解释、ref 找不到，都在这里报出来，不等读者悬停才发现 */
  private check(): void {
    const content = this.content();
    this.state = content.ok ? { state: "ready" } : { state: "error", message: content.message };
    this.dataset.state = this.state.state;
    markSettled(this);
  }

  private content(): { ok: true; nodes: () => Node[] } | { ok: false; message: string } {
    const tip = this.getAttribute("tip");
    if (tip?.trim()) return { ok: true, nodes: () => [document.createTextNode(tip)] };
    const own = [...this.children].find(
      (el): el is HTMLTemplateElement => el.localName === "template",
    );
    if (own) return { ok: true, nodes: () => [own.content.cloneNode(true)] };
    const ref = this.getAttribute("ref");
    if (ref) {
      const target = document.getElementById(ref);
      if (target instanceof HTMLTemplateElement) {
        return { ok: true, nodes: () => [target.content.cloneNode(true)] };
      }
      return { ok: false, message: `ref="${ref}" 没找到对应的 <template id="${ref}">` };
    }
    return { ok: false, message: "没有解释内容：写 tip 属性、子元素 <template> 或 ref" };
  }

  private parentTip(): DrTipElement | null {
    const bubble = this.closest("dr-bubble") as DrBubbleElement | null;
    return bubble?.owner ?? null;
  }

  private isOpen(): boolean {
    return this.bubble?.hasAttribute("data-open") ?? false;
  }

  private enter(): void {
    this.hovering = true;
    clearTimeout(this.closeTimer);
    if (this.isOpen()) return;
    clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => this.open(), OPEN_DELAY);
  }

  private leave(): void {
    this.hovering = false;
    clearTimeout(this.openTimer);
    this.scheduleClose();
  }

  private scheduleClose(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (!this.hovering && !this.focused && this.children_.size === 0) this.close();
    }, CLOSE_DELAY);
  }

  public open(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    if (this.isOpen()) return;
    const content = this.content();
    if (!content.ok) return;
    const bubble = this.ensureBubble();
    bubble.replaceChildren(...content.nodes());
    bubble.setAttribute("data-open", "");
    this.openedAt = Date.now();
    this.setAttribute("data-open", "");
    this.setAttribute("aria-expanded", "true");
    if (typeof bubble.showPopover === "function") {
      try {
        bubble.showPopover();
      } catch {
        // 已经在顶层里了（快速开关时会遇到），不用再进
      }
    }
    this.parentTip()?.holdOpen(this);
    document.addEventListener("pointerdown", this.onOutside, true);
    this.stopAutoUpdate = autoUpdate(this, bubble, () => void this.position());
  }

  public close(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    // 子气泡先关，不然父气泡没了它还悬在半空
    for (const child of [...this.children_]) child.close();
    const bubble = this.bubble;
    if (!bubble || !this.isOpen()) return;
    this.stopAutoUpdate?.();
    this.stopAutoUpdate = null;
    document.removeEventListener("pointerdown", this.onOutside, true);
    if (typeof bubble.hidePopover === "function") {
      try {
        bubble.hidePopover();
      } catch {
        // 没在顶层里
      }
    }
    bubble.removeAttribute("data-open");
    this.removeAttribute("data-open");
    this.setAttribute("aria-expanded", "false");
    this.parentTip()?.release(this);
  }

  private holdOpen(child: DrTipElement): void {
    this.children_.add(child);
    clearTimeout(this.closeTimer);
  }

  private release(child: DrTipElement): void {
    this.children_.delete(child);
    this.scheduleClose();
  }

  /** 点在词和气泡（含子气泡）之外就关：触屏上没有 pointerleave 可等 */
  private readonly onOutside = (event: PointerEvent): void => {
    const target = event.target as Node;
    if (this.contains(target) || this.bubble?.contains(target)) return;
    if ([...this.children_].some((child) => child.bubble?.contains(target))) return;
    this.close();
  };

  private ensureBubble(): DrBubbleElement {
    if (this.bubble) return this.bubble;
    const bubble = document.createElement("dr-bubble") as DrBubbleElement;
    bubble.owner = this;
    counter += 1;
    bubble.id = `durer-tip-${counter}`;
    bubble.setAttribute("role", "tooltip");
    bubble.setAttribute("popover", "manual");
    // 触屏的 pointerenter / leave 是按下抬起时补发的，不代表悬停，只认鼠标和笔
    bubble.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      this.hovering = true;
      clearTimeout(this.closeTimer);
    });
    bubble.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      this.hovering = false;
      this.scheduleClose();
    });
    bubble.addEventListener("pointerdown", () => {
      this.pressedInside = true;
      setTimeout(() => {
        this.pressedInside = false;
      });
    });
    document.body.append(bubble);
    this.setAttribute("aria-describedby", bubble.id);
    this.bubble = bubble;
    return bubble;
  }

  private async position(): Promise<void> {
    const bubble = this.bubble;
    if (!bubble || !this.isOpen()) return;
    const arrowEl = bubble.shadowRoot?.querySelector(".arrow") as HTMLElement;
    const placement = this.getAttribute("placement") as TipPlacement | null;
    const {
      x,
      y,
      placement: side,
      middlewareData,
    } = await computePosition(this, bubble, {
      strategy: "fixed",
      placement: placement && TIP_PLACEMENTS.includes(placement) ? placement : "top",
      middleware: [
        offset(10),
        flip(),
        shift({ padding: 8 }),
        arrow({ element: arrowEl, padding: 8 }),
      ],
    });
    Object.assign(bubble.style, { left: `${x}px`, top: `${y}px` });
    const base = side.split("-")[0] as TipPlacement;
    bubble.dataset.side = base;
    const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" }[base];
    const data = middlewareData.arrow;
    Object.assign(arrowEl.style, {
      left: data?.x != null ? `${data.x}px` : "",
      top: data?.y != null ? `${data.y}px` : "",
      right: "",
      bottom: "",
      [opposite]: "-6px",
    });
  }
}
