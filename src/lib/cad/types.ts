import type { IModel } from 'makerjs';

export type Point2D = readonly [number, number];

export type MirrorAxis = 'x' | 'y';

export type Anchor2D =
  | 'origin'
  | 'center'
  | 'topLeft'
  | 'top'
  | 'topRight'
  | 'right'
  | 'bottomRight'
  | 'bottom'
  | 'bottomLeft'
  | 'left';

export interface NodeMetadata {
  layer?: string;
  tags?: readonly string[];
}

interface BaseNode {
  readonly metadata: NodeMetadata;
}

export interface RectNode extends BaseNode {
  readonly kind: 'rect';
  readonly width: number;
  readonly height: number;
}

export interface CircleNode extends BaseNode {
  readonly kind: 'circle';
  readonly radius: number;
}

export interface RoundRectNode extends BaseNode {
  readonly kind: 'roundRect';
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}

export interface PolylineNode extends BaseNode {
  readonly kind: 'polyline';
  readonly points: readonly Point2D[];
  readonly closed: boolean;
}

export interface MakerModelNode extends BaseNode {
  readonly kind: 'makerModel';
  readonly model: IModel;
}

export type PrimitiveNode =
  | RectNode
  | CircleNode
  | RoundRectNode
  | PolylineNode;

export interface TranslateTransform {
  readonly type: 'translate';
  readonly x: number;
  readonly y: number;
}

export interface RotateTransform {
  readonly type: 'rotate';
  readonly angleDeg: number;
  readonly origin?: Point2D;
}

export interface ScaleTransform {
  readonly type: 'scale';
  readonly factor: number;
  readonly origin?: Point2D;
}

export interface MirrorTransform {
  readonly type: 'mirror';
  readonly axis: MirrorAxis;
}

export type Transform2D =
  | TranslateTransform
  | RotateTransform
  | ScaleTransform
  | MirrorTransform;

export interface BooleanNode extends BaseNode {
  readonly kind: 'boolean';
  readonly operation: 'union' | 'cut' | 'intersect';
  readonly left: EntityNode;
  readonly right: EntityNode;
}

export interface TransformNode extends BaseNode {
  readonly kind: 'transform';
  readonly child: EntityNode;
  readonly transform: Transform2D;
}

export interface AssemblyNode extends BaseNode {
  readonly kind: 'assembly';
  readonly children: Readonly<Record<string, EntityNode>>;
  readonly placementChildId?: string;
}

export interface SketchNode extends BaseNode {
  readonly kind: 'sketch';
  readonly children: Readonly<Record<string, EntityNode>>;
}

export type EntityNode =
  | PrimitiveNode
  | MakerModelNode
  | BooleanNode
  | TransformNode
  | AssemblyNode;

export interface CircleHoleSpec {
  readonly kind: 'circle';
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface SlotHoleSpec {
  readonly kind: 'slot';
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly width: number;
  readonly angleDeg?: number;
}

export type PanelHoleSpec = CircleHoleSpec | SlotHoleSpec;

export interface PanelInsetOptions {
  readonly margin: number;
  readonly radius?: number;
}

export type PanelEdgeKind = 'plain' | 'tabs' | 'notches';

export interface PlainPanelEdgeOptions {
  readonly kind: 'plain';
}

export interface ProfiledPanelEdgeOptions {
  readonly kind: Exclude<PanelEdgeKind, 'plain'>;
  readonly count: number;
  readonly segmentLength: number;
  readonly depth?: number;
  readonly inset?: number;
}

export type PanelEdgeOptions = PlainPanelEdgeOptions | ProfiledPanelEdgeOptions;

export interface PanelEdgesOptions {
  readonly top?: PanelEdgeOptions;
  readonly right?: PanelEdgeOptions;
  readonly bottom?: PanelEdgeOptions;
  readonly left?: PanelEdgeOptions;
}

export interface PanelOptions {
  readonly width: number;
  readonly height: number;
  readonly radius?: number;
  readonly inset?: PanelInsetOptions;
  readonly holes?: readonly PanelHoleSpec[];
  readonly thickness?: number;
  readonly clearance?: number;
  readonly edges?: PanelEdgesOptions;
}

export interface GearOptions {
  readonly teeth: number;
  readonly outerRadius: number;
  readonly rootRadius: number;
  readonly bore?: number;
  readonly toothFraction?: number;
  readonly rootFraction?: number;
  readonly tipFraction?: number;
  readonly rotationDeg?: number;
}

export interface SpokeWheelOptions {
  readonly outerRadius: number;
  readonly innerRadius: number;
  readonly spokes: number;
  readonly spokeWidth?: number;
  readonly hubRadius?: number;
  readonly bore?: number;
}

export interface ClockFaceOptions {
  readonly radius: number;
  readonly rimWidth?: number;
  readonly tickCount?: number;
  readonly tickLength?: number;
  readonly tickWidth?: number;
  readonly centerHole?: number;
}

export interface PolarArrayOptions {
  readonly radius?: number;
  readonly origin?: Point2D;
  readonly startAngleDeg?: number;
  readonly rotateItems?: boolean;
}

export interface SvgPathImportOptions {
  readonly bezierAccuracy?: number;
}

export interface FlatLayoutOptions {
  readonly columns: number;
  readonly gapX: number;
  readonly gapY: number;
}

export type AlignTarget = Shape2DLike | Assembly2DLike | Point2D;

export interface Shape2DLike {
  getNode(): EntityNode;
  translate(x: number, y: number): Shape2DLike;
  rotate(angleDeg: number, origin?: Point2D): Shape2DLike;
  scale(factor: number, origin?: Point2D): Shape2DLike;
  mirror(axis: MirrorAxis): Shape2DLike;
  union(other: Shape2DLike | Assembly2DLike): Shape2DLike;
  cut(other: Shape2DLike | Assembly2DLike): Shape2DLike;
  intersect(other: Shape2DLike | Assembly2DLike): Shape2DLike;
  moveTo(point: Point2D, anchor?: Anchor2D): Shape2DLike;
  centerAt(point: Point2D): Shape2DLike;
  alignTo(
    target: AlignTarget,
    fromAnchor?: Anchor2D,
    toAnchor?: Anchor2D
  ): Shape2DLike;
  array(count: number, stepX: number, stepY?: number): Assembly2DLike;
  grid(
    columns: number,
    rows: number,
    stepX: number,
    stepY: number
  ): Assembly2DLike;
  polarArray(
    count: number,
    angleStepDeg: number,
    options?: PolarArrayOptions
  ): Assembly2DLike;
  onLayer(layer: string): Shape2DLike;
  tag(...tags: string[]): Shape2DLike;
}

export type Assembly2DLike = Shape2DLike;

export type CadChildLike = Shape2DLike | Assembly2DLike;
export type CadChildrenValue = CadChildLike | readonly CadChildLike[];
export type CadChildrenInput =
  | Record<string, CadChildrenValue>
  | readonly CadChildLike[];

export interface SketchLike {
  getNode(): SketchNode;
  onLayer(layer: string): SketchLike;
  tag(...tags: string[]): SketchLike;
}

export interface CadRuntime {
  rect(width: number, height: number): Shape2DLike;
  circle(radius: number): Shape2DLike;
  ring(outerRadius: number, innerRadius: number): Shape2DLike;
  roundRect(width: number, height: number, radius: number): Shape2DLike;
  capsule(width: number, height: number): Shape2DLike;
  slot(length: number, width: number): Shape2DLike;
  polyline(
    points: readonly Point2D[],
    options?: { closed?: boolean }
  ): Shape2DLike;
  trackPath(
    points: readonly Point2D[],
    width: number,
    options?: { closed?: boolean }
  ): Shape2DLike;
  frame(
    width: number,
    height: number,
    thickness: number,
    options?: { radius?: number }
  ): Shape2DLike;
  panel(options: PanelOptions): Assembly2DLike;
  spokeWheel(options: SpokeWheelOptions): Shape2DLike;
  gear(options: GearOptions): Shape2DLike;
  clockFace(options: ClockFaceOptions): Assembly2DLike;
  fromSvgPathData(
    pathData: string,
    options?: SvgPathImportOptions
  ): Shape2DLike;
  flatLayout(parts: CadChildrenInput, options: FlatLayoutOptions): SketchLike;
  assembly(children: CadChildrenInput): Assembly2DLike;
  sketch(children: CadChildrenInput): SketchLike;
  compileToMaker(value: Shape2DLike | Assembly2DLike | SketchLike): IModel;
}
