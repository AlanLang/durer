import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
  useLayoutEffect,
} from "react";
import { createRoot, type Root } from "react-dom/client";

interface BoundaryProps {
  children: ReactNode;
  onError: (error: Error) => void;
}

/**
 * 演示组件渲染时抛错不能把页面带崩：抓住，交给元素显示在演示上方。
 * 每次换代码都换 key 重建 boundary，上一版的错误状态不会留到下一版。
 */
class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  public override state = { failed: false };

  public static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  public override componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onError(error);
  }

  public override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/** 放在演示组件后面：它的 layout effect 跑的时候，演示组件已经提交进 DOM 了 */
function Committed({ onCommit }: { onCommit: () => void }): null {
  useLayoutEffect(onCommit);
  return null;
}

export interface RenderCallbacks {
  /** 组件抛错（渲染期或 effect 里），Boundary 抓到后调 */
  onError: (error: Error) => void;
  /** 画进 DOM 了：换一版源码、换一次 props 各调一次，组件自己的状态更新不算 */
  onCommit: () => void;
}

type Demo = ComponentType<Record<string, unknown>>;

export interface Mount {
  /** 换一版源码：组件重新挂载，状态清零 */
  render: (component: Demo, props: Record<string, unknown>, callbacks: RenderCallbacks) => void;
  /** 只换 props（`<dr-steps>` 翻页）：同一个组件实例，状态保留 */
  setProps: (props: Record<string, unknown>) => void;
  unmount: () => void;
}

export function mount(container: Element | DocumentFragment): Mount {
  let root: Root | null = createRoot(container);
  let version = 0;
  let current: { component: Demo; callbacks: RenderCallbacks } | null = null;
  const draw = (props: Record<string, unknown>) => {
    if (!current) return;
    const { component: Demo, callbacks } = current;
    root?.render(
      <Boundary key={version} onError={callbacks.onError}>
        <Demo {...props} />
        <Committed onCommit={callbacks.onCommit} />
      </Boundary>,
    );
  };
  return {
    render(component, props, callbacks) {
      version += 1;
      current = { component, callbacks };
      draw(props);
    },
    setProps: draw,
    unmount() {
      root?.unmount();
      root = null;
    },
  };
}
