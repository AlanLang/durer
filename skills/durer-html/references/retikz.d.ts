// @retikz/react 0.4.0 的组件属性（摘自其类型声明，build 时生成，不要手改）

// ---- kernel/runtime/Layout.d.ts ----
/**
 * @description 含 {@link ScopeStyleProps} 级联样式子集——设任一样式 prop 时把 children 包进合成根 `<Scope>`，
 *   等价于用户手写一层根 `<Scope>`（编译产物同一 IR）。内层 `<Scope>` / 图元显式属性照常级联覆盖。
 *   与直接传 `ir` prop 并用时样式 props 被忽略（dev 警告）
 */
export type LayoutProps = ScopeStyleProps & {
    /** 直接喂 IR JSON（持久化 / AI / 编辑器场景），与 children 二选一 */
    ir?: IRScene;
    /** Kernel/Sugar JSX children */
    children?: ReactNode;
    /**
     * `ir` prop 模式下按图元 id 提供的水合 handler 注册表（无 JSX children 可收集时用）
     * @description JSX 模式经组件 `on<Event>` props 收集，无需此 prop；直接传 `ir` 时无组件 props，
     *   改由此 prop 按 `{ [id]: { click, ... } }` 提供。两路结果经 `createHydrationController` 绑到 figure root
     *   （svg root 或 `<canvas>`），svg / canvas 双模共用同一注册表与分发
     */
    handlers?: HydrationHandlers;
    /** SVG 元素宽度（CSS 长度或数字） */
    width?: number | string;
    /** SVG 元素高度（CSS 长度或数字） */
    height?: number | string;
    /**
     * 显式视框 `{ x, y, width, height }`，覆盖自动算的范围（固定尺寸 / 裁剪 / 多图对齐）
     * @description 注入构造出的 IR 根（`ir.viewBox`）；设值时 `<svg viewBox>` 用它、忽略 padding。
     *   与直接传 `ir` prop 自带的 viewBox 冲突时，本 prop 优先；都缺省时回退自动 AABB
     */
    viewBox?: IRViewBox;
    /** 透传到 svg 元素的 className */
    className?: string;
    /** 透传到 svg 元素的内联样式 */
    style?: CSSProperties;
    /** 渲染目标；缺省为 SVG，设为 canvas 时用同一份图形数据绘制到 `<canvas>` */
    renderer?: 'svg' | 'canvas';
    /**
     * 是否播放动画；未传时跟随系统减少动态效果偏好，显式 `true` / `false` 强制开关
     * @description SVG 模式：`load` track 经内联 `<style>` CSS 自播、交互 track 经 WAAPI 桥按 trigger 驱动；
     *   `animate={false}` 走 settled 静态。显式 `true` 会覆盖 `prefers-reduced-motion`；祖先
     *   `AnimationModeProvider` 存在时由最近的 Provider 统一覆盖本属性
     */
    animate?: boolean;
    /**
     * 静态截帧时刻（毫秒）；给定时渲染「定格在该时刻」的静态图
     * @description SVG：各 track 在该时刻的值烘焙成静态属性 / transform；Canvas：按该时刻画一帧、不起 rAF。覆盖 `animate`
     */
    snapshotAt?: number;
    /**
     * 命令式动画句柄出口：传一个 ref，挂载后写入 `AnimationControls`（`play` / `pause` / `seek`）
     * @description 与 vanilla `view.animation` 对等——SVG 控制交互（`manual` / `visible` / `{onEvent}`）track 的 WAAPI
     *   句柄；Canvas 控制 rAF 时钟。无动画 / 降级时为 `null`。供组件外命令式控制（按钮播放 / 暂停 / 跳帧）
     */
    animationRef?: Ref<AnimationControls | null>;
    /**
     * 全图时间轴动画 tracks（如 `viewBox` 镜头动画）
     * @description 配 `cameraTo()` preset：`<Layout animations={[cameraTo({ from, to })]}>`。元素级动画写在各元素
     *   的 `animations` prop 上；与直接传 `ir` prop 并用时，本 prop 追加到整张图
     */
    animations?: Array<IRAnimationTrack>;
    /**
     * 自定义缓动注册表（兑现动画扩展口）：名 → cubic-bezier 四元组 / 缓动函数
     * @description preset / track 的 `easing` 写注册名（如 `fadeIn({ easing: 'spring' })`）即生效。cubic-bezier
     *   形式 SVG（CSS）+ Canvas 都支持；函数形式仅 Canvas（SVG 退 linear 并告警）
     */
    easings?: EasingRegistry;
    /**
     * 自定义动画属性通道插值器：通道名 → { interpolate, applyCanvas }
     * @description 让 `property` 用内置之外的名字（如 `blur`）。**当前仅 Canvas 生效**（`renderer="canvas"`）；
     *   SVG 无内置映射 → 告警并跳过该 track（渲染 base）
     */
    animationProperties?: AnimationPropertyRegistry;
    /**
     * SVG `<defs>` 资源 id 前缀，覆盖默认的 `useId()` 派生值
     * @description marker / paint / clip 的 id 与 `url(#...)` 引用共用此前缀确保多实例不撞。缺省使用 React 生成的稳定 id。
     *   SSR 到客户端水合需要 id 逐字一致时，服务端渲染和客户端 `<Layout idPrefix>` 传同一前缀即可对齐
     */
    idPrefix?: string;
    /**
     * 节点相对定位（`Node.position = { direction, of }`）的默认距离，单位 user units
     * @description 节点 position 自带 `distance` 时优先用自带值，都缺省时回退到 24
     */
    nodeDistance?: number;
    /**
     * 默认字号
     * @description 透传给 `CompileOptions.fontSize`；`font.size` 缺省时使用此值，同时作为 preset 与 rem 的根字号
     * @default DEFAULT_FONT_SIZE (16)
     */
    fontSize?: number;
    /**
     * 运行时注入的第三方 / 自定义节点形状
     * @description `<Node shape="...">` 写 shape 名字或 `{ type, params }`，具体形状定义通过本 prop 注册。
     *   与内置或自定义同名会报错；引用未注册形状也会报错
     */
    shapes?: ReadonlyArray<ShapeDefinition>;
    /**
     * 运行时注入的第三方 / 自定义连接面
     * @description `<Node boundary="...">` 写 boundary 名字或 `{ type, params }`，具体连接面定义通过本 prop 注册。
     *   未注册时会回退到同名 shape 边界
     */
    boundaries?: ReadonlyArray<BoundaryDefinition>;
    /** 运行时注入的第三方 / 自定义裁剪区；`<Scope clip={{ kind: '...' }}>` 可引用这些定义 */
    clips?: ReadonlyArray<ClipDefinition>;
    /**
     * 运行时注入的第三方 / 自定义箭头
     * @description `<Path arrowDetail={{ shape: '...' }}>` 写箭头名，具体箭头定义通过本 prop 注册。
     *   与内置或自定义同名会报错；引用未注册箭头也会报错
     */
    arrows?: ReadonlyArray<ArrowDefinition>;
    /**
     * 运行时注入的第三方 / 自定义填充图案
     * @description `fill={{ kind: 'pattern', shape: '...' }}` 写 pattern 名，具体图案定义通过本 prop 注册。
     *   与内置或自定义同名会报错；引用未注册 pattern 也会报错
     */
    patterns?: ReadonlyArray<PatternDefinition>;
    /**
     * 运行时注入的第三方 / 自定义路径生成器
     * @description `<Step kind="generator" name="...">` 写生成器名，具体生成逻辑通过本 prop 注册。
     *   未注册名会报错；`params` 必须是 JSON 可序列化对象
     */
    pathGenerators?: ReadonlyArray<PathGeneratorDefinition>;
    /**
     * 运行时注入的第三方 / 自定义 Path kind
     * @description `<Path kind="...">` 写路径类型名，具体整条路径的生成逻辑通过本 prop 注册
     */
    pathKinds?: ReadonlyArray<PathKindDefinition>;
    /** 运行时注入的 ribbon 宽度 profile；ribbon path 可按名称引用这些宽度曲线 */
    ribbonWidthProfiles?: ReadonlyArray<RibbonWidthProfileDefinition>;
    /**
     * 运行时注入的 Tier 2 composite 展开逻辑
     * @description 带 `namespace` / `type` 的高层节点通过本 prop 注册并展开；未注册时会发出 warning 并跳过
     */
    composites?: ReadonlyArray<CompositeDefinition>;
    /**
     * 运行时注入的公式渲染能力
     * @description `<Node>` 文本中的 `$...$`、`$$...$$` 或显式 tex run 会通过它转成可渲染字形。
     *   通常由 `@retikz/tex` 提供；缺省时公式内容会按降级规则处理并发出 warning
     */
    lowerTex?: LowerTex;
    /**
     * 节点 layout 完成后的批量观测回调
     * @description React 在 commit 后通过 effect 通知本次 compile 产出的节点布局，避免在 render 阶段触发用户副作用
     */
    onNodeLayouts?: (layouts: Array<CompiledNodeLayout>) => void;
    /**
     * 可选：显式注入的可嵌入 Tier2 适配器列表（逃生舱）
     * @description 主路径是子组件静态属性（Component.isTier2Embeddable + embeddableAdapter）自动识别；
     *   本 prop 用于测试注入 / 显式控制 / 未挂静态属性的 domain。按 adapter.displayName 匹配子组件，覆盖静态属性
     */
    embeddables?: Array<EmbeddableTier2Adapter>;
};
/**
 * <Layout> 顶层容器
 * @description children 模式写 Kernel / Sugar JSX；`ir` 模式直接传入 JSON IR。组件负责计算图形尺寸、
 *   选择 SVG 或 Canvas 输出、绑定事件水合和动画控制
 */
export declare const Layout: FC<LayoutProps>;

// ---- kernel/components/Node.d.ts ----
export type NodeProps = HydrationEventProps & {
    /** 节点 id；其他 Path/Draw 通过这个 id 引用本节点 */
    id?: string;
    /** 节点形状：rectangle（默认）/ circle / ellipse / diamond */
    shape?: IRNode['shape'];
    /** 连接面：边与本节点相交时使用的边界形状（TikZ `connect as`）；默认 'shape'（沿用视觉形状）；'circle' = 真圆；其它已注册 shape 名或 `{ type, params }` = 借用该 shape 边界 */
    boundary?: IRBoundary;
    /** 用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局。须为 JSON 可序列化对象 */
    meta?: IRNode['meta'];
    /** 元素级时间轴动画；每条 track 描述一个可动画属性，渲染端播放或降级为静态，不参与布局 */
    animations?: IRNode['animations'];
    /**
     * 节点中心位置
     * @description 五种形态：笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }`（TikZ `[<direction>=<distance> of <id>]` 同义）/ 偏移定位 `{ of, offset }`（TikZ `calc` 同义）/ 比例 partway `{ between: [A, B], fraction }`（A、B 连线上 fraction 处）；非笛卡尔形态在编译时解析
     */
    position: IRPosition | PolarPosition | IRAtPosition | IRAtPositionInput | IROffsetPosition | IRBetweenPosition;
    /** 旋转角度（度数，与 TikZ 一致），绕节点中心；正值顺时针 */
    rotate?: number;
    /**
     * children 内容：文本
     * @description 与 `text` 二选一、`text` 优先；支持字符串内嵌 `\n` / 模板字面量 / 字符串数组 / 混 `<Text>` 带样式行。
     *   字符串里可写行内公式 `$...$`（inline）/ `$$...$$`（display），编译期在注入 `<Layout lowerTex>` 时解析；未注入则字面渲染
     */
    children?: ReactNode;
    /**
     * 显式 text，优先级高于 children
     * @description `string` 单行（可含 `$...$` 公式）/ `Array<string | LineSpec>` 多行可对单行覆盖 fill / opacity / font，
     *   或行内混排 `{ runs: [{ text }, { tex }] }`（每 run 可单独着色）
     */
    text?: string | Array<IRLineSpec>;
    /** 多行文本对齐：left / center（默认）/ right；只影响多行块内各行的水平对齐 */
    align?: NodeTextAlignValue;
    /** 行高（user units）；不填走 `font.size × 1.2` 默认 */
    lineHeight?: number;
    /** 折行阈值（user units）：超过才折行、短文本盒收缩（非固定段落宽）；西文按词、CJK 按字。不填 = 不自动折行 */
    maxTextWidth?: number;
    /** 字体规格：family / size / weight / style 全部可选；不填走渲染端默认值 */
    font?: IRFont;
    /** 内边距；数字作用于四边，对象按 left/right/top/bottom > x/y > default 解析 */
    padding?: number | IRBoxSpacing;
    /** 外边距；数字作用于四边，对象按 left/right/top/bottom > x/y > default 解析 */
    margin?: number | IRBoxSpacing;
    /** 主色（TikZ `color=`）；stroke / fill / textColor 未单设则随它，并级联到内部文字与边 label */
    color?: IRNode['color'];
    /** 背景色 */
    fill?: IRNode['fill'];
    /** 填充透明度 0~1 */
    fillOpacity?: number;
    /** 描边色 */
    stroke?: IRNode['stroke'];
    /** 描边透明度 0~1（TikZ `stroke opacity`） */
    strokeOpacity?: number;
    /** 描边宽度 */
    strokeWidth?: number;
    /** 描边虚线预设：等价于 dashPattern={[4, 2]}；与 `dotted` / `dashPattern` 优先级：dashPattern > dashed > dotted */
    dashed?: boolean;
    /** 描边点线预设：等价于 dashPattern={[1, 2]} */
    dotted?: boolean;
    /** 显式 dash pattern（如 [4, 2]）；优先级最高 */
    dashPattern?: IRNode['dashPattern'];
    /** 描边 dash offset */
    dashOffset?: IRNode['dashOffset'];
    /** 圆角半径（user units）；只对 `rectangle` shape 生效。建议用形状 params 形式 `shape={{ type: 'rectangle', params: { cornerRadius } }}` */
    cornerRadius?: number;
    /** 最小 border 宽度（user units）；不足时撑开 bbox */
    /** 最小 border 尺寸；数字作用于宽高，对象按 width/height > default 解析 */
    minimumSize?: number | IRBoxSize;
    /** 均匀缩放因子；同时影响 bbox / 字号 / padding / margin / 路径附着点（与 TikZ scale 一致） */
    scale?: number | IRAxisScale;
    /** 横向缩放，优先于 `scale` */
    /** 纵向缩放，优先于 `scale` */
    /** 文字颜色（块级默认；行级 LineSpec.fill 可覆盖）；不填走 `currentColor` */
    textColor?: string;
    /** 整节点透明度 0~1（同时作用于 shape 与 text） */
    opacity?: number;
    /** 主形状投影（仅作用于 shape 几何，不含 text / label / pin）；预设字符串（`sm`/`md`/`lg`/`xl`/`2xl`/`none`）或对象 `{ preset?, offsetX?, offsetY?, blur?, color?, opacity? }`（显式字段覆盖 preset） */
    shadow?: IRNode['shadow'];
    /** 主形状混合模式（与下方已绘内容混合，W3C 分离模式）；不含 text / label / pin。省略 / `normal` = 普通 source-over */
    blendMode?: IRNode['blendMode'];
    /**
     * 节点附属标签——TikZ `[label=top:foo]` 同义
     * @description 单对象或数组；每条 label 接 `text` / `position?` / `distance?` / 样式继承；`position` 接 8 方向枚举或数字角度（`label=30:foo` 等价 `position: 30`），缺省 'top'，distance 缺省 12
     */
    label?: IRNodeLabelInput | Array<IRNodeLabelInput>;
    /** 显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层（同 scope / 顶层）子节点间生效 */
    zIndex?: IRNode['zIndex'];
};
/**
 * Node 声明一个可引用的节点
 * @description 声明一个带位置、文本、形状和样式的可引用节点；组件自身不渲染 DOM，最终由 `<Layout>` 输出到
 *   SVG 或 Canvas
 */
export declare const Node: FC<NodeProps>;

// ---- sugar/path/Draw.d.ts ----
export type DrawProps = {
    /**
     * way 数组 DSL
     * @description 节点 id / 笛卡尔 / 极坐标 / 相对偏移 `{ position, type: DrawWay.Relative | DrawWay.Accumulate }` / 折角算子 `'-|'` `'|-'`（或 `DrawWay.Hv`/`DrawWay.Vh`）/ 闭合 `DrawWay.Cycle` / 曲线算子 `{ curve | cubic | bend }`（infix）/ 形状算子 `{ arc | circle | ellipse }`（infix，以"上一项"为圆心，不消耗下一项）/ 边标注算子 `{ label }`（infix，修饰下一段）
     */
    way: WayDSL;
    /** 描边色，省略时用 currentColor */
    stroke?: IRPath['stroke'];
    /** 描边宽度，省略时为 1 */
    strokeWidth?: IRPath['strokeWidth'];
    /** 描边 dash pattern（如 [4, 2]） */
    dashPattern?: IRPath['dashPattern'];
    /** 描边 dash offset */
    dashOffset?: IRPath['dashOffset'];
    /** 端点形状（TikZ `line cap`） */
    lineCap?: IRPath['lineCap'];
    /** 拐点形状（TikZ `line join`，仅描边视觉） */
    lineJoin?: IRPath['lineJoin'];
    /** 折线 line-line 接缝几何圆角半径（TikZ `rounded corners=`，改几何，区别于 `lineJoin`） */
    roundedCorners?: IRPath['roundedCorners'];
    /** 投影：预设字符串（`'sm'`…`'2xl'`）或 `{ preset?, offsetX?, offsetY?, blur?, color?, opacity? }`（显式字段覆盖 preset） */
    shadow?: IRPath['shadow'];
    /** 混合模式（CSS `mix-blend-mode`）：与下方已绘内容按 W3C 分离公式混合 */
    blendMode?: IRPath['blendMode'];
    /** 语义 stroke 档位糖（TikZ `ultra thin` … `ultra thick`）；显式 `strokeWidth` 始终优先 */
    thickness?: PathThicknessValue;
    /**
     * 路径级箭头方向
     * @description `'->'` 终点 / `'<-'` 起点 / `'<->'` 两端；省略或 `'none'` 无箭头
     */
    arrow?: PathProps['arrow'];
    /**
     * 箭头详细配置
     * @description 顶层默认 + 可选 `start` / `end` 子对象逐字段 merge override。空心 shape 上 `fill` silent no-op
     */
    arrowDetail?: PathProps['arrowDetail'];
    /** 闭合区域填充色，省略 = 不填充。配合 way 末尾的 `DrawWay.Cycle` 画填充形状 */
    fill?: IRPath['fill'];
    /** 填充规则：`'nonzero'`（默认）/ `'evenodd'` */
    fillRule?: IRPath['fillRule'];
    /** 整 path 透明度 0~1 */
    opacity?: IRPath['opacity'];
    /** 仅 fill 透明度 0~1 */
    fillOpacity?: IRPath['fillOpacity'];
    /** 仅 stroke 透明度 0~1（TikZ `stroke opacity`） */
    strokeOpacity?: IRPath['strokeOpacity'];
    /** 显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层子节点间生效 */
    zIndex?: IRPath['zIndex'];
};
/**
 * Sugar 组件——展开为等价的 <Path><Step.../></Path> Kernel 子树
 * @description 用 way 数组按顺序声明移动、连线、折角、曲线、闭合、圆弧和边标注；能力与手写 `<Path>` /
 *   `<Step>` 等价，不额外引入新的路径语义
 */
export declare const Draw: FC<DrawProps>;

// ---- kernel/components/Scope.d.ts ----
/**
 * @description 级联样式子集（graphic state + 四通道 every-X）抽到共享 {@link ScopeStyleProps}，与 `<Layout>` 复用；
 *   本类型额外带容器 / 命名空间 / 局部变换 / 屏障 / 栈序 / 裁剪等 scope 专属字段
 */
export type ScopeProps = ScopeStyleProps & HydrationEventProps & {
    /**
     * 可选 scope 引用 id；设值后可把整个 scope 的包络当作引用目标
     * @description 外部 path / position 可用 `scope.id` / `scope.id.<anchor>` / `scope.id.<deg>` 引用该包络；
     *   这个外部句柄不受 `localNamespace` 影响
     */
    id?: string;
    /**
     * 是否创建本地命名空间；true 时子节点 id 不向父 frame 传播（外部不可见）
     * @description 子节点 id 只在本 scope 内可引用；外部无法引用这些子节点 id，但 `scope.id` 自己仍可从外层引用
     */
    localNamespace?: boolean;
    /**
     * 局部 transform 列表；数组顺序应用，与 SVG transform list 一致
     * @description 支持 translate / polar-translate / at-translate / offset-translate / between-translate / rotate / scale
     */
    transforms?: Array<IRTransformInput>;
    /** 继承屏障：切外层对应通道继承（true 全切 / 数组按 'node'|'path'|'label'|'arrow' 切） */
    resetStyle?: IRScope['resetStyle'];
    /** 显式栈序：作用于 scope 整体在父层的位置（不影响 scope 内部子元素相对栈序）；缺省 0 = 声明顺序 */
    zIndex?: IRScope['zIndex'];
    /** 裁剪区（rect / circle / ellipse / polygon / path / compound / custom，scope 局部坐标）；设值则裁剪 scope 内全部子元素 */
    clip?: IRScope['clip'];
    /** scope id 注册的 synthetic 包络形状（受控枚举 'rectangle' | 'circle'，非 Node shape 那种开放 shape 引用）；缺省为 'rectangle'（AABB） */
    boundingShape?: IRScope['boundingShape'];
    /** 用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局，也不下传给子元素。须为 JSON 可序列化对象 */
    meta?: IRScope['meta'];
    /** scope 整体的时间轴动画；渲染端播放或降级为静态，不参与布局，也不下传给子元素 */
    animations?: IRScope['animations'];
    /** scope 子节点：嵌套 Node / Path / Coordinate / Scope */
    children?: ReactNode;
};
/**
 * Scope 容器组件——TikZ `\begin{scope}[...]...\end{scope}` 同义
 * @description 给一组节点 / 路径提供局部样式、命名空间、变换、裁剪和引用包络
 */
export declare const Scope: FC<ScopeProps>;

// ---- kernel/components/Text.d.ts ----
export type TextProps = {
    /** 行内容（字符串或数字；数字按文本渲染） */
    children: string | number;
    /** 行级覆盖颜色；不填走 Node 块级默认 */
    fill?: string;
    /** 行级透明度 0~1；不填走 Node 块级默认 */
    opacity?: number;
    /** 行级字体覆盖；missing 字段继承 Node 的 `font` 块级值 */
    font?: IRFont;
};
/**
 * Text 是 Node 内的"行级"标记组件——本身不渲染
 * @description 声明一行节点文本；与字符串内容按 JSX 顺序合并，字段只覆盖当前这一行
 */
export declare const Text: FC<TextProps>;

// ---- sugar/shapes/Circle.d.ts ----
export type CircleProps = PathVisualProps & AngleInput & BoxAdjustmentProps & {
    /** 按 box 拟合圆时取最短边（contain）还是最长边（cover） */
    fit?: 'contain' | 'cover';
    /** 用于拟合圆的 box 输入 */
    box?: ShapeBox;
    /** 给定角度时的局部闭合方式 */
    closed?: 'chord' | 'open' | 'sector';
} & ({
    center: IRTarget;
    radius: number;
} | {
    center: IRTarget;
    diameter: number;
} | {
    from: [number, number];
    to: [number, number];
} | {
    corner1: [number, number];
    corner2: [number, number];
} | {
    box: ShapeBox;
});
/**
 * Circle sugar——展开为 Path + circlePath step
 */
export declare const Circle: FC<CircleProps>;

// ---- sugar/shapes/Rectangle.d.ts ----
/** `<Rectangle>` 形态：四选一定两对角 */
export type RectangleProps = PathVisualProps & {
    /** 四角同圆角半径；缺省直角 */
    cornerRadius?: number;
} & ({
    corner1: IRTarget;
    corner2: IRTarget;
} | {
    center: [number, number];
    width: number;
    height: number;
} | {
    center: [number, number];
    side: number;
} | {
    corner1: [number, number];
    width: number;
    height: number;
});
/**
 * Rectangle sugar——展开为 `<Path><Step move(from)><Step rectangle(from,to)></Path>`
 * @description `{ corner1, corner2 }` 透传（任意 Target，直接作 rectangle 的 from/to）；其余形态需算坐标 → 限 literal 笛卡尔
 */
export declare const Rectangle: FC<RectangleProps>;

// ---- sugar/shapes/Ellipse.d.ts ----
export type EllipseProps = PathVisualProps & AngleInput & BoxAdjustmentProps & {
    /** 用于拟合椭圆的 box 输入 */
    box?: ShapeBox;
    /** 给定角度时的局部闭合方式 */
    closed?: 'chord' | 'open' | 'sector';
} & ({
    center: IRTarget;
    radius: IRStepAnisotropicRadius;
} | {
    center: IRTarget;
    diameterX: number;
    diameterY: number;
} | {
    corner1: [number, number];
    corner2: [number, number];
} | {
    box: ShapeBox;
});
/**
 * Ellipse sugar——展开为 Path + ellipsePath step
 */
export declare const Ellipse: FC<EllipseProps>;

// ---- sugar/shapes/Arc.d.ts ----
/**
 * `<Arc>` 形态：圆弧（radius number）/ 椭圆弧（radius {x,y}）；必给角度（startAngle / endAngle / sweepAngle 三选二）
 * @description 默认开放弧；给 `close="chord"`（弦闭合）或 `close="sector"`（连回圆心成扇形）可闭合成可填充区域。
 *   `label` 透传到底层弧 step，文字沿弧定位（`position` 缺省 midway，按 startAngle..endAngle 线性映射）
 */
export type ArcProps = PathVisualProps & AngleInput & {
    /** 闭合方式：缺省 / `'open'` 开放弧；`'chord'` 两端点连弦闭合；`'sector'` 连回圆心成扇形（均可填充） */
    close?: 'open' | 'chord' | 'sector';
    /** 弧上边标注（透传到底层 step；`position` 缺省 midway，沿弧 startAngle..endAngle 线性映射） */
    label?: IRStepLabelInput;
} & {
    center: DslTarget;
    radius: IRStepRadius;
};
/**
 * Arc sugar——弧线（默认开放，可弦闭合 / 扇形闭合）
 * @description center 透传（任意 Target，可为节点 id / 极坐标）。
 *   开放弧展开为 `<Path><Step move(center)><Step arc(center)></Path>`（pen 停在弧端点，输出与旧版一致）；
 *   `close="chord"|"sector"` 改走 circlePath / ellipsePath 的对应 closed 模式（圆心 = 游标）
 */
export declare const Arc: FC<ArcProps>;

// ---- sugar/shapes/Grid.d.ts ----
type BorderRenderOrder = 'before' | 'after';
type GridPathVisualProps = Pick<PathVisualProps, 'color' | 'stroke' | 'strokeWidth' | 'dashPattern' | 'dashOffset' | 'lineCap' | 'lineJoin' | 'thickness' | 'fill' | 'fillRule' | 'opacity' | 'fillOpacity' | 'strokeOpacity' | 'zIndex'>;
/** `<Grid>` 形态：两选一定包围盒 + 步长（单值 step 或分轴 xStep/yStep）。点位限 literal 笛卡尔 */
export type GridProps = PathVisualProps & {
    /** 单值步长（xStep = yStep = step）；与 xStep/yStep 二选一，分轴优先 */
    step?: number;
    /** x 轴步长（覆盖 step） */
    xStep?: number;
    /** y 轴步长（覆盖 step） */
    yStep?: number;
    /** 网格对齐基准；缺省从范围左上角起算 */
    origin?: [number, number];
    /** 网格相位偏移；与 origin 叠加，缺省 [0, 0] */
    offset?: [number, number];
    /** 范围不能被 step 整除时是否补最后一条边界线 */
    includeBoundary?: boolean;
    /** 是否画竖线 */
    showVertical?: boolean;
    /** 是否画横线 */
    showHorizontal?: boolean;
    /** 每隔多少条线使用主网格样式 */
    majorEvery?: number;
    /** 主网格从第几条开始计算 */
    majorOffset?: number;
    /** 主网格颜色 */
    majorColor?: GridPathVisualProps['color'];
    /** 主网格描边 */
    majorStroke?: GridPathVisualProps['stroke'];
    /** 主网格描边宽度 */
    majorStrokeWidth?: GridPathVisualProps['strokeWidth'];
    /** 主网格虚线 */
    majorDashPattern?: GridPathVisualProps['dashPattern'];
    /** 主网格虚线偏移 */
    majorDashOffset?: GridPathVisualProps['dashOffset'];
    /** 主网格端点 */
    majorLineCap?: GridPathVisualProps['lineCap'];
    /** 主网格拐点 */
    majorLineJoin?: GridPathVisualProps['lineJoin'];
    /** 主网格语义粗细 */
    majorThickness?: GridPathVisualProps['thickness'];
    /** 主网格整体透明度 */
    majorOpacity?: GridPathVisualProps['opacity'];
    /** 主网格描边透明度 */
    majorStrokeOpacity?: GridPathVisualProps['strokeOpacity'];
    /** 是否画外边框 */
    border?: boolean;
    /** 外边框与网格范围的距离 */
    borderPadding?: number;
    /** 边框是否作为底层画在网格线前面 */
    borderRenderOrder?: BorderRenderOrder;
    /** 网格线是否延伸到外边框 */
    clipToBorder?: boolean;
    /** 外边框主色 */
    borderColor?: GridPathVisualProps['color'];
    /** 外边框描边 */
    borderStroke?: GridPathVisualProps['stroke'];
    /** 外边框描边宽度 */
    borderStrokeWidth?: GridPathVisualProps['strokeWidth'];
    /** 外边框虚线 */
    borderDashPattern?: GridPathVisualProps['dashPattern'];
    /** 外边框虚线偏移 */
    borderDashOffset?: GridPathVisualProps['dashOffset'];
    /** 外边框端点 */
    borderLineCap?: GridPathVisualProps['lineCap'];
    /** 外边框拐点 */
    borderLineJoin?: GridPathVisualProps['lineJoin'];
    /** 外边框语义粗细 */
    borderThickness?: GridPathVisualProps['thickness'];
    /** 外边框填充 */
    borderFill?: GridPathVisualProps['fill'];
    /** 外边框填充规则 */
    borderFillRule?: GridPathVisualProps['fillRule'];
    /** 外边框整体透明度 */
    borderOpacity?: GridPathVisualProps['opacity'];
    /** 外边框填充透明度 */
    borderFillOpacity?: GridPathVisualProps['fillOpacity'];
    /** 外边框描边透明度 */
    borderStrokeOpacity?: GridPathVisualProps['strokeOpacity'];
    /** 外边框栈序 */
    borderZIndex?: GridPathVisualProps['zIndex'];
} & ({
    corner1: [number, number];
    corner2: [number, number];
} | {
    center: [number, number];
    width: number;
    height: number;
});
/**
 * Grid sugar——展开为多条 `<Path>`（每条 move + line）和可选外边框 Path
 * @description 默认按范围左上角起算，显式给 origin/offset 时按基准点对齐；includeBoundary 会补范围边界线。
 *   普通视觉 prop 透传到内部线，major* 覆盖主网格线，border* 覆盖外边框。点位限 literal 笛卡尔
 */
export declare const Grid: FC<GridProps>;
export {};
