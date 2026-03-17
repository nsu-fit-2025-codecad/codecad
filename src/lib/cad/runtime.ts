import makerjs, { type IModel } from 'makerjs';
import { compileSketchToMaker, compileToMaker } from './compiler';
import type {
  AlignTarget,
  Anchor2D,
  AssemblyNode,
  Assembly2DLike,
  CadRuntime,
  CircleHoleSpec,
  ClockFaceOptions,
  EntityNode,
  FlatLayoutOptions,
  GearOptions,
  MakerModelNode,
  MirrorAxis,
  NodeMetadata,
  PanelInsetOptions,
  PanelEdgeOptions,
  PanelEdgesOptions,
  PanelOptions,
  ProfiledPanelEdgeOptions,
  Point2D,
  PolarArrayOptions,
  PrimitiveNode,
  Shape2DLike,
  SketchNode,
  SketchLike,
  SlotHoleSpec,
  SpokeWheelOptions,
  SvgPathImportOptions,
  Transform2D,
} from './types';

const EMPTY_METADATA: NodeMetadata = {};

const MAKER_MODEL_KEYS = new Set([
  'models',
  'paths',
  'origin',
  'layer',
  'units',
  'caption',
  'notes',
  'seed',
  'type',
]);

const DEFAULT_ETCH_LAYER = 'etch';
const GEAR_FRACTION_EPSILON = 1e-9;

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const assertFiniteNumber = (value: number, name: string): void => {
  if (!isFiniteNumber(value)) {
    throw new Error(`${name} must be a finite number`);
  }
};

const assertPositiveNumber = (value: number, name: string): void => {
  assertFiniteNumber(value, name);

  if (value <= 0) {
    throw new Error(`${name} must be greater than 0`);
  }
};

const assertNonNegativeNumber = (value: number, name: string): void => {
  assertFiniteNumber(value, name);

  if (value < 0) {
    throw new Error(`${name} cannot be negative`);
  }
};

const assertPositiveInteger = (value: number, name: string): void => {
  assertPositiveNumber(value, name);

  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
};

const normalizeTags = (currentTags: readonly string[], nextTags: string[]) => {
  const uniqueTags = new Set(currentTags);

  nextTags.forEach((tag) => {
    const normalizedTag = tag.trim();

    if (normalizedTag) {
      uniqueTags.add(normalizedTag);
    }
  });

  return [...uniqueTags];
};

const withMetadata = <TNode extends EntityNode | SketchNode>(
  node: TNode,
  updates: Partial<NodeMetadata>
): TNode => {
  const metadata: NodeMetadata = { ...node.metadata };

  if (updates.layer !== undefined) {
    metadata.layer = updates.layer;
  }

  if (updates.tags !== undefined) {
    metadata.tags = updates.tags;
  }

  return {
    ...node,
    metadata,
  };
};

const createTransformNode = (
  child: EntityNode,
  transform: Transform2D
): EntityNode => ({
  kind: 'transform',
  child,
  transform,
  metadata: EMPTY_METADATA,
});

const createBooleanNode = (
  left: EntityNode,
  right: EntityNode,
  operation: 'union' | 'cut' | 'intersect'
): EntityNode => ({
  kind: 'boolean',
  operation,
  left,
  right,
  metadata: EMPTY_METADATA,
});

const createModelNode = (model: IModel): MakerModelNode => ({
  kind: 'makerModel',
  model: makerjs.model.clone(model),
  metadata: EMPTY_METADATA,
});

const validatePoint = (point: Point2D, index: number): void => {
  if (!Array.isArray(point) || point.length !== 2) {
    throw new Error(`Point at index ${index} must be a tuple of [x, y]`);
  }

  assertFiniteNumber(point[0], `Point ${index} x`);
  assertFiniteNumber(point[1], `Point ${index} y`);
};

const clonePoint = (point: Point2D): Point2D => [point[0], point[1]];

const isPoint2D = (value: unknown): value is Point2D =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number';

const validateChildId = (childId: string): void => {
  if (!childId.trim()) {
    throw new Error('Child ids cannot be empty');
  }
};

const toEntityNode = (value: Shape2DLike | Assembly2DLike): EntityNode =>
  value.getNode();

const createChildrenMap = (
  children: Record<string, Shape2DLike | Assembly2DLike>
): Readonly<Record<string, EntityNode>> =>
  Object.fromEntries(
    Object.entries(children).map(([childId, child]) => {
      validateChildId(childId);
      return [childId, child.getNode()];
    })
  );

interface PlacementBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const boundsFromExtents = (
  extents: ReturnType<typeof makerjs.measure.modelExtents>
): PlacementBounds => {
  if (!extents) {
    throw new Error('Unable to measure cad entity');
  }

  return {
    minX: extents.low[0],
    minY: extents.low[1],
    maxX: extents.high[0],
    maxY: extents.high[1],
  };
};

const measureCompiledNode = (node: EntityNode): PlacementBounds => {
  const extents = makerjs.measure.modelExtents(compileToMaker(node));

  return boundsFromExtents(extents);
};

const getBoundsCenter = (bounds: PlacementBounds): Point2D => [
  (bounds.minX + bounds.maxX) / 2,
  (bounds.minY + bounds.maxY) / 2,
];

const getBoundsCorners = (bounds: PlacementBounds): Point2D[] => [
  [bounds.minX, bounds.minY],
  [bounds.maxX, bounds.minY],
  [bounds.maxX, bounds.maxY],
  [bounds.minX, bounds.maxY],
];

const createBoundsFromPoints = (
  points: readonly Point2D[]
): PlacementBounds => {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const rotatePoint = (
  point: Point2D,
  angleDeg: number,
  origin: Point2D = [0, 0]
): Point2D => {
  const radians = (angleDeg * Math.PI) / 180;
  const x = point[0] - origin[0];
  const y = point[1] - origin[1];

  return [
    origin[0] + x * Math.cos(radians) - y * Math.sin(radians),
    origin[1] + x * Math.sin(radians) + y * Math.cos(radians),
  ];
};

const scalePoint = (
  point: Point2D,
  factor: number,
  origin: Point2D = [0, 0]
): Point2D => [
  origin[0] + (point[0] - origin[0]) * factor,
  origin[1] + (point[1] - origin[1]) * factor,
];

const mirrorPoint = (point: Point2D, axis: MirrorAxis): Point2D =>
  axis === 'x' ? [-point[0], point[1]] : [point[0], -point[1]];

const transformBounds = (
  bounds: PlacementBounds,
  transform: Transform2D
): PlacementBounds => {
  const transformedCorners = getBoundsCorners(bounds).map((corner) => {
    switch (transform.type) {
      case 'translate':
        return [corner[0] + transform.x, corner[1] + transform.y] as Point2D;
      case 'rotate':
        return rotatePoint(corner, transform.angleDeg, transform.origin);
      case 'scale':
        return scalePoint(corner, transform.factor, transform.origin);
      case 'mirror':
        return mirrorPoint(corner, transform.axis);
    }
  });

  return createBoundsFromPoints(transformedCorners);
};

const resolvePlacementChildNode = (node: AssemblyNode): EntityNode | null => {
  const preferredChildId =
    node.placementChildId ??
    ['body', 'outline'].find((childId) => node.children[childId]);

  if (!preferredChildId) {
    return null;
  }

  return node.children[preferredChildId] ?? null;
};

const getPlacementBounds = (node: EntityNode): PlacementBounds => {
  switch (node.kind) {
    case 'transform':
      return transformBounds(getPlacementBounds(node.child), node.transform);
    case 'assembly': {
      const placementChildNode = resolvePlacementChildNode(node);
      return placementChildNode
        ? getPlacementBounds(placementChildNode)
        : measureCompiledNode(node);
    }
    default:
      return measureCompiledNode(node);
  }
};

const getAnchorPoint = (node: EntityNode, anchor: Anchor2D): Point2D => {
  if (anchor === 'origin') {
    return [0, 0];
  }

  const bounds = getPlacementBounds(node);
  const minX = bounds.minX;
  const minY = bounds.minY;
  const maxX = bounds.maxX;
  const maxY = bounds.maxY;
  const [centerX, centerY] = getBoundsCenter(bounds);

  switch (anchor) {
    case 'center':
      return [centerX, centerY];
    case 'topLeft':
      return [minX, minY];
    case 'top':
      return [centerX, minY];
    case 'topRight':
      return [maxX, minY];
    case 'right':
      return [maxX, centerY];
    case 'bottomRight':
      return [maxX, maxY];
    case 'bottom':
      return [centerX, maxY];
    case 'bottomLeft':
      return [minX, maxY];
    case 'left':
      return [minX, centerY];
    default:
      return [0, 0];
  }
};

const buildAssemblyNode = (nodes: readonly EntityNode[], prefix: string) => ({
  kind: 'assembly' as const,
  children: Object.fromEntries(
    nodes.map((node, index) => [`${prefix}${index + 1}`, node])
  ),
  metadata: EMPTY_METADATA,
});

const createAssemblyEntity = (
  children: Record<string, Shape2DLike | Assembly2DLike>,
  placementChildId?: string
): Assembly2D =>
  new Assembly2D({
    kind: 'assembly',
    children: createChildrenMap(children),
    placementChildId,
    metadata: EMPTY_METADATA,
  });

const asShape = (node: EntityNode): Shape2D => new Shape2D(node);

const asAssembly = (node: EntityNode): Assembly2D => new Assembly2D(node);

const buildCircleHole = (hole: CircleHoleSpec): Shape2D =>
  asShape(cad.circle(hole.radius).moveTo([hole.x, hole.y], 'center').getNode());

const buildSlotHole = (hole: SlotHoleSpec): Shape2D =>
  asShape(
    cad
      .slot(hole.length, hole.width)
      .moveTo([hole.x, hole.y], 'center')
      .rotate(hole.angleDeg ?? 0, [hole.x, hole.y])
      .getNode()
  );

const buildPanelInset = (
  width: number,
  height: number,
  inset: PanelInsetOptions
): Shape2D => {
  assertPositiveNumber(inset.margin, 'inset.margin');

  const insetWidth = width - inset.margin * 2;
  const insetHeight = height - inset.margin * 2;

  if (insetWidth <= 0 || insetHeight <= 0) {
    throw new Error('inset.margin leaves no remaining panel body');
  }

  const insetRadius = Math.max(0, inset.radius ?? 0);

  const insetShape =
    insetRadius > 0
      ? cad.roundRect(insetWidth, insetHeight, insetRadius)
      : cad.rect(insetWidth, insetHeight);

  return asShape(
    insetShape
      .translate(inset.margin, inset.margin)
      .onLayer(DEFAULT_ETCH_LAYER)
      .getNode()
  );
};

const getPanelEdgeLength = (
  edge: keyof PanelEdgesOptions,
  width: number,
  height: number
): number => (edge === 'top' || edge === 'bottom' ? width : height);

const resolvePanelEdgeDepth = (
  edge: ProfiledPanelEdgeOptions,
  thickness: number | undefined
): number => {
  if (edge.depth !== undefined) {
    assertPositiveNumber(edge.depth, 'panel edge depth');
    return edge.depth;
  }

  if (thickness === undefined) {
    throw new Error(
      'panel thickness must be provided when panel edge depth is omitted'
    );
  }

  assertPositiveNumber(thickness, 'thickness');

  return thickness;
};

const isProfiledPanelEdge = (
  edge: PanelEdgeOptions | undefined
): edge is ProfiledPanelEdgeOptions => !!edge && edge.kind !== 'plain';

const validatePanelEdges = (
  width: number,
  height: number,
  radius: number,
  edges: PanelEdgesOptions | undefined,
  thickness: number | undefined,
  clearance: number
): void => {
  assertNonNegativeNumber(clearance, 'clearance');

  if (!edges) {
    if (thickness !== undefined) {
      assertPositiveNumber(thickness, 'thickness');
    }

    return;
  }

  const hasProfiledEdge = Object.values(edges).some(
    (edge) => edge && edge.kind !== 'plain'
  );

  if (!hasProfiledEdge) {
    if (thickness !== undefined) {
      assertPositiveNumber(thickness, 'thickness');
    }

    return;
  }

  if (radius > 0) {
    throw new Error('panel edges with tabs or notches do not support radius');
  }

  Object.entries(edges).forEach(([edgeName, edgeOptions]) => {
    if (!isProfiledPanelEdge(edgeOptions)) {
      return;
    }

    assertPositiveInteger(edgeOptions.count, `${edgeName}.count`);
    assertPositiveNumber(
      edgeOptions.segmentLength,
      `${edgeName}.segmentLength`
    );

    const inset = edgeOptions.inset ?? 0;
    assertNonNegativeNumber(inset, `${edgeName}.inset`);

    const depth = resolvePanelEdgeDepth(edgeOptions, thickness);
    const edgeLength = getPanelEdgeLength(
      edgeName as keyof PanelEdgesOptions,
      width,
      height
    );
    const availableLength = edgeLength - inset * 2;
    const gap =
      (availableLength - edgeOptions.count * edgeOptions.segmentLength) /
      (edgeOptions.count + 1);

    if (availableLength <= 0) {
      throw new Error(`${edgeName} inset leaves no usable edge length`);
    }

    if (edgeOptions.count * edgeOptions.segmentLength > availableLength) {
      throw new Error(
        `${edgeName} edge profile does not fit on the panel side`
      );
    }

    if (depth <= 0) {
      throw new Error(`${edgeName} edge depth must be greater than 0`);
    }

    const perpendicularSpan =
      edgeName === 'top' || edgeName === 'bottom' ? height : width;
    const effectiveDepth =
      edgeOptions.kind === 'notches' ? depth + clearance : depth;

    if (edgeOptions.kind === 'notches' && effectiveDepth >= perpendicularSpan) {
      throw new Error(
        `${edgeName} notch depth must be smaller than the panel span`
      );
    }

    if (edgeOptions.kind === 'notches' && gap < clearance) {
      throw new Error(
        `${edgeName} clearance is too large for the selected notch spacing`
      );
    }
  });
};

const distributeEdgeSegments = (
  edgeLength: number,
  count: number,
  segmentLength: number,
  inset: number
): number[] => {
  const availableLength = edgeLength - inset * 2;
  const gap = (availableLength - count * segmentLength) / (count + 1);

  return Array.from({ length: count }, (_, index) => {
    return inset + gap * (index + 1) + segmentLength * index;
  });
};

type PanelEdgeName = keyof PanelEdgesOptions;

interface ResolvedPanelEdgeProfile {
  readonly kind: PanelEdgeOptions['kind'];
  readonly depth: number;
  readonly segments: ReadonlyArray<{
    readonly start: number;
    readonly end: number;
  }>;
}

const PANEL_CONTOUR_EPSILON = 1e-9;

const arePointsEqual = (left: Point2D, right: Point2D): boolean =>
  Math.abs(left[0] - right[0]) <= PANEL_CONTOUR_EPSILON &&
  Math.abs(left[1] - right[1]) <= PANEL_CONTOUR_EPSILON;

const shouldCollapseCollinearPoint = (
  previous: Point2D,
  current: Point2D,
  next: Point2D
): boolean => {
  const vectorA: Point2D = [current[0] - previous[0], current[1] - previous[1]];
  const vectorB: Point2D = [next[0] - current[0], next[1] - current[1]];
  const cross = vectorA[0] * vectorB[1] - vectorA[1] * vectorB[0];
  const dot = vectorA[0] * vectorB[0] + vectorA[1] * vectorB[1];

  return (
    Math.abs(cross) <= PANEL_CONTOUR_EPSILON && dot > PANEL_CONTOUR_EPSILON
  );
};

const normalizeClosedContourPoints = (
  points: readonly Point2D[]
): readonly Point2D[] => {
  const normalized = [...points];

  while (
    normalized.length > 1 &&
    arePointsEqual(normalized[0], normalized[normalized.length - 1])
  ) {
    normalized.pop();
  }

  let changed = true;

  while (changed && normalized.length > 2) {
    changed = false;

    for (let index = 0; index < normalized.length; index += 1) {
      const previousIndex = (index - 1 + normalized.length) % normalized.length;
      const nextIndex = (index + 1) % normalized.length;
      const previous = normalized[previousIndex];
      const current = normalized[index];
      const next = normalized[nextIndex];

      if (arePointsEqual(previous, current)) {
        normalized.splice(index, 1);
        changed = true;
        break;
      }

      if (shouldCollapseCollinearPoint(previous, current, next)) {
        normalized.splice(index, 1);
        changed = true;
        break;
      }
    }
  }

  return normalized;
};

const appendContourPoint = (points: Point2D[], point: Point2D): void => {
  if (points.length === 0) {
    points.push(point);
    return;
  }

  if (arePointsEqual(points[points.length - 1], point)) {
    return;
  }

  points.push(point);
};

const resolvePanelEdgeProfile = (
  edgeName: PanelEdgeName,
  width: number,
  height: number,
  edges: PanelEdgesOptions | undefined,
  thickness: number | undefined,
  clearance: number
): ResolvedPanelEdgeProfile | null => {
  const edgeOptions = edges?.[edgeName];

  if (!isProfiledPanelEdge(edgeOptions)) {
    return null;
  }

  const edgeLength = getPanelEdgeLength(edgeName, width, height);
  const inset = edgeOptions.inset ?? 0;
  const baseDepth = resolvePanelEdgeDepth(edgeOptions, thickness);
  const segmentStarts = distributeEdgeSegments(
    edgeLength,
    edgeOptions.count,
    edgeOptions.segmentLength,
    inset
  );

  if (edgeOptions.kind === 'tabs') {
    return {
      kind: 'tabs',
      depth: baseDepth,
      segments: segmentStarts.map((start) => ({
        start,
        end: start + edgeOptions.segmentLength,
      })),
    };
  }

  return {
    kind: 'notches',
    depth: baseDepth + clearance,
    segments: segmentStarts.map((start) => ({
      start: start - clearance / 2,
      end: start + edgeOptions.segmentLength + clearance / 2,
    })),
  };
};

const appendTopEdgeProfile = (
  points: Point2D[],
  width: number,
  profile: ResolvedPanelEdgeProfile | null
): void => {
  if (!profile) {
    appendContourPoint(points, [width, 0]);
    return;
  }

  let cursor = 0;
  const offset = profile.kind === 'tabs' ? -profile.depth : profile.depth;

  profile.segments.forEach((segment) => {
    appendContourPoint(points, [segment.start, 0]);
    appendContourPoint(points, [segment.start, offset]);
    appendContourPoint(points, [segment.end, offset]);
    appendContourPoint(points, [segment.end, 0]);
    cursor = segment.end;
  });

  if (cursor < width) {
    appendContourPoint(points, [width, 0]);
  }
};

const appendRightEdgeProfile = (
  points: Point2D[],
  height: number,
  profile: ResolvedPanelEdgeProfile | null,
  width: number
): void => {
  if (!profile) {
    appendContourPoint(points, [width, height]);
    return;
  }

  let cursor = 0;
  const offset =
    profile.kind === 'tabs' ? width + profile.depth : width - profile.depth;

  profile.segments.forEach((segment) => {
    appendContourPoint(points, [width, segment.start]);
    appendContourPoint(points, [offset, segment.start]);
    appendContourPoint(points, [offset, segment.end]);
    appendContourPoint(points, [width, segment.end]);
    cursor = segment.end;
  });

  if (cursor < height) {
    appendContourPoint(points, [width, height]);
  }
};

const appendBottomEdgeProfile = (
  points: Point2D[],
  width: number,
  height: number,
  profile: ResolvedPanelEdgeProfile | null
): void => {
  if (!profile) {
    appendContourPoint(points, [0, height]);
    return;
  }

  let cursor = width;
  const offset =
    profile.kind === 'tabs' ? height + profile.depth : height - profile.depth;

  [...profile.segments].reverse().forEach((segment) => {
    appendContourPoint(points, [segment.end, height]);
    appendContourPoint(points, [segment.end, offset]);
    appendContourPoint(points, [segment.start, offset]);
    appendContourPoint(points, [segment.start, height]);
    cursor = segment.start;
  });

  if (cursor > 0) {
    appendContourPoint(points, [0, height]);
  }
};

const appendLeftEdgeProfile = (
  points: Point2D[],
  height: number,
  profile: ResolvedPanelEdgeProfile | null
): void => {
  if (!profile) {
    appendContourPoint(points, [0, 0]);
    return;
  }

  let cursor = height;
  const offset = profile.kind === 'tabs' ? -profile.depth : profile.depth;

  [...profile.segments].reverse().forEach((segment) => {
    appendContourPoint(points, [0, segment.end]);
    appendContourPoint(points, [offset, segment.end]);
    appendContourPoint(points, [offset, segment.start]);
    appendContourPoint(points, [0, segment.start]);
    cursor = segment.start;
  });

  if (cursor > 0) {
    appendContourPoint(points, [0, 0]);
  }
};

const buildPanelEdgeContour = (
  width: number,
  height: number,
  edges: PanelEdgesOptions | undefined,
  thickness: number | undefined,
  clearance: number
): Shape2D => {
  const top = resolvePanelEdgeProfile(
    'top',
    width,
    height,
    edges,
    thickness,
    clearance
  );
  const right = resolvePanelEdgeProfile(
    'right',
    width,
    height,
    edges,
    thickness,
    clearance
  );
  const bottom = resolvePanelEdgeProfile(
    'bottom',
    width,
    height,
    edges,
    thickness,
    clearance
  );
  const left = resolvePanelEdgeProfile(
    'left',
    width,
    height,
    edges,
    thickness,
    clearance
  );
  const contourPoints: Point2D[] = [];

  appendContourPoint(contourPoints, [0, 0]);
  appendTopEdgeProfile(contourPoints, width, top);
  appendRightEdgeProfile(contourPoints, height, right, width);
  appendBottomEdgeProfile(contourPoints, width, height, bottom);
  appendLeftEdgeProfile(contourPoints, height, left);

  return asShape(
    cad
      .polyline(normalizeClosedContourPoints(contourPoints), {
        closed: true,
      })
      .getNode()
  );
};

const unionMany = (
  shapes: readonly (Shape2DLike | Assembly2DLike)[]
): Shape2D => {
  if (shapes.length === 0) {
    throw new Error('At least one shape is required');
  }

  const [first, ...rest] = shapes;
  let result = asShape(first.getNode());

  rest.forEach((shape) => {
    result = asShape(result.union(shape).getNode());
  });

  return result;
};

const buildSlotModel = (start: Point2D, end: Point2D, width: number): IModel =>
  new makerjs.models.Slot(start, end, width / 2);

const buildGearPoints = ({
  teeth,
  outerRadius,
  rootRadius,
  toothFraction,
  rootFraction,
  tipFraction = 0.45,
  rotationDeg = 0,
}: GearOptions): Point2D[] => {
  assertPositiveInteger(teeth, 'teeth');
  assertPositiveNumber(outerRadius, 'outerRadius');
  assertPositiveNumber(rootRadius, 'rootRadius');

  if (rootRadius >= outerRadius) {
    throw new Error('rootRadius must be smaller than outerRadius');
  }

  const resolvedToothFraction = toothFraction ?? tipFraction;
  const resolvedRootFraction = rootFraction ?? 0.22;

  if (resolvedToothFraction <= 0 || resolvedToothFraction >= 1) {
    throw new Error('toothFraction must be between 0 and 1');
  }

  if (resolvedRootFraction <= 0 || resolvedRootFraction >= 1) {
    throw new Error('rootFraction must be between 0 and 1');
  }

  const combinedFraction = resolvedToothFraction + resolvedRootFraction;
  const normalizedCombinedFraction =
    Math.abs(combinedFraction - 1) <= GEAR_FRACTION_EPSILON
      ? 1
      : combinedFraction;

  if (normalizedCombinedFraction > 1) {
    throw new Error('toothFraction + rootFraction cannot exceed 1');
  }

  const points: Point2D[] = [];
  const pitch = (Math.PI * 2) / teeth;
  const startAngle = (rotationDeg * Math.PI) / 180;
  const halfToothSpan = (resolvedToothFraction * pitch) / 2;
  const normalizedRootFraction =
    normalizedCombinedFraction === 1
      ? 1 - resolvedToothFraction
      : resolvedRootFraction;
  const halfRootSpan = (normalizedRootFraction * pitch) / 2;

  for (let index = 0; index < teeth; index += 1) {
    const centerAngle = startAngle + index * pitch;
    const valleyStartAngle = centerAngle - pitch / 2 + halfRootSpan;
    const leftTipAngle = centerAngle - halfToothSpan;
    const rightTipAngle = centerAngle + halfToothSpan;
    const valleyEndAngle = centerAngle + pitch / 2 - halfRootSpan;

    points.push([
      rootRadius * Math.cos(valleyStartAngle),
      rootRadius * Math.sin(valleyStartAngle),
    ]);
    points.push([
      outerRadius * Math.cos(leftTipAngle),
      outerRadius * Math.sin(leftTipAngle),
    ]);
    points.push([
      outerRadius * Math.cos(rightTipAngle),
      outerRadius * Math.sin(rightTipAngle),
    ]);
    points.push([
      rootRadius * Math.cos(valleyEndAngle),
      rootRadius * Math.sin(valleyEndAngle),
    ]);
  }

  return points;
};

abstract class BaseCadEntity<TNode extends EntityNode> {
  protected constructor(private readonly node: TNode) {}

  protected abstract create(node: EntityNode): this;

  getNode(): TNode {
    return this.node;
  }

  translate(x: number, y: number): this {
    assertFiniteNumber(x, 'x');
    assertFiniteNumber(y, 'y');

    return this.create(
      createTransformNode(this.node, { type: 'translate', x, y })
    );
  }

  rotate(angleDeg: number, origin?: Point2D): this {
    assertFiniteNumber(angleDeg, 'angleDeg');

    if (origin) {
      validatePoint(origin, 0);
    }

    return this.create(
      createTransformNode(this.node, {
        type: 'rotate',
        angleDeg,
        origin,
      })
    );
  }

  scale(factor: number, origin?: Point2D): this {
    assertPositiveNumber(factor, 'factor');

    if (origin) {
      validatePoint(origin, 0);
    }

    return this.create(
      createTransformNode(this.node, {
        type: 'scale',
        factor,
        origin,
      })
    );
  }

  mirror(axis: MirrorAxis): this {
    return this.create(
      createTransformNode(this.node, { type: 'mirror', axis })
    );
  }

  union(other: Shape2DLike | Assembly2DLike): Shape2D {
    return asShape(createBooleanNode(this.node, toEntityNode(other), 'union'));
  }

  cut(other: Shape2DLike | Assembly2DLike): Shape2D {
    return asShape(createBooleanNode(this.node, toEntityNode(other), 'cut'));
  }

  intersect(other: Shape2DLike | Assembly2DLike): Shape2D {
    return asShape(
      createBooleanNode(this.node, toEntityNode(other), 'intersect')
    );
  }

  moveTo(point: Point2D, anchor: Anchor2D = 'origin'): this {
    validatePoint(point, 0);

    const currentPoint = getAnchorPoint(this.node, anchor);

    return this.translate(
      point[0] - currentPoint[0],
      point[1] - currentPoint[1]
    );
  }

  centerAt(point: Point2D): this {
    return this.moveTo(point, 'center');
  }

  alignTo(
    target: AlignTarget,
    fromAnchor: Anchor2D = 'center',
    toAnchor: Anchor2D = 'center'
  ): this {
    if (isPoint2D(target)) {
      return this.moveTo(target, fromAnchor);
    }

    const sourcePoint = getAnchorPoint(this.node, fromAnchor);
    const targetPoint = getAnchorPoint(target.getNode(), toAnchor);

    return this.translate(
      targetPoint[0] - sourcePoint[0],
      targetPoint[1] - sourcePoint[1]
    );
  }

  array(count: number, stepX: number, stepY = 0): Assembly2D {
    assertPositiveInteger(count, 'count');
    assertFiniteNumber(stepX, 'stepX');
    assertFiniteNumber(stepY, 'stepY');

    const nodes = Array.from({ length: count }, (_, index) =>
      index === 0
        ? this.node
        : createTransformNode(this.node, {
            type: 'translate',
            x: stepX * index,
            y: stepY * index,
          })
    );

    return asAssembly(buildAssemblyNode(nodes, 'item'));
  }

  grid(
    columns: number,
    rows: number,
    stepX: number,
    stepY: number
  ): Assembly2D {
    assertPositiveInteger(columns, 'columns');
    assertPositiveInteger(rows, 'rows');
    assertFiniteNumber(stepX, 'stepX');
    assertFiniteNumber(stepY, 'stepY');

    const nodes: EntityNode[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if (row === 0 && column === 0) {
          nodes.push(this.node);
          continue;
        }

        nodes.push(
          createTransformNode(this.node, {
            type: 'translate',
            x: column * stepX,
            y: row * stepY,
          })
        );
      }
    }

    return asAssembly(buildAssemblyNode(nodes, 'cell'));
  }

  polarArray(
    count: number,
    angleStepDeg: number,
    options?: PolarArrayOptions
  ): Assembly2D {
    assertPositiveInteger(count, 'count');
    assertFiniteNumber(angleStepDeg, 'angleStepDeg');

    const radius = options?.radius ?? 0;
    const origin = clonePoint(options?.origin ?? [0, 0]);
    const startAngleDeg = options?.startAngleDeg ?? 0;
    const rotateItems = options?.rotateItems ?? false;

    assertNonNegativeNumber(radius, 'radius');
    validatePoint(origin, 0);
    assertFiniteNumber(startAngleDeg, 'startAngleDeg');

    const nodes = Array.from({ length: count }, (_, index) => {
      const angleDeg = startAngleDeg + angleStepDeg * index;
      let shape = asShape(this.node);

      if (radius > 0) {
        const angleRad = (angleDeg * Math.PI) / 180;
        shape = shape.translate(
          origin[0] + Math.cos(angleRad) * radius,
          origin[1] + Math.sin(angleRad) * radius
        );
      }

      if (rotateItems) {
        shape = shape.rotate(angleDeg, origin);
      }

      return shape.getNode();
    });

    return asAssembly(buildAssemblyNode(nodes, 'polar'));
  }

  onLayer(layer: string): this {
    const normalizedLayer = layer.trim();

    if (!normalizedLayer) {
      throw new Error('layer cannot be empty');
    }

    return this.create(withMetadata(this.node, { layer: normalizedLayer }));
  }

  tag(...tags: string[]): this {
    const mergedTags = normalizeTags(this.node.metadata.tags ?? [], tags);

    return this.create(withMetadata(this.node, { tags: mergedTags }));
  }
}

export class Shape2D extends BaseCadEntity<EntityNode> implements Shape2DLike {
  constructor(node: EntityNode) {
    super(node);
  }

  protected create(node: EntityNode): this {
    return new Shape2D(node) as this;
  }
}

export class Assembly2D
  extends BaseCadEntity<EntityNode>
  implements Assembly2DLike
{
  constructor(node: EntityNode) {
    super(node);
  }

  protected create(node: EntityNode): this {
    return new Assembly2D(node) as this;
  }
}

export class Sketch implements SketchLike {
  constructor(private readonly node: SketchNode) {}

  getNode(): SketchNode {
    return this.node;
  }

  onLayer(layer: string): Sketch {
    const normalizedLayer = layer.trim();

    if (!normalizedLayer) {
      throw new Error('layer cannot be empty');
    }

    return new Sketch(withMetadata(this.node, { layer: normalizedLayer }));
  }

  tag(...tags: string[]): Sketch {
    const mergedTags = normalizeTags(this.node.metadata.tags ?? [], tags);

    return new Sketch(withMetadata(this.node, { tags: mergedTags }));
  }
}

export const isShape2D = (value: unknown): value is Shape2D =>
  value instanceof Shape2D;

export const isAssembly2D = (value: unknown): value is Assembly2D =>
  value instanceof Assembly2D;

export const isSketch = (value: unknown): value is Sketch =>
  value instanceof Sketch;

export type CadRenderable = Shape2D | Assembly2D | Sketch;

export const isCadRenderable = (value: unknown): value is CadRenderable =>
  isShape2D(value) || isAssembly2D(value) || isSketch(value);

export const toMakerModel = (value: CadRenderable): IModel => {
  if (isSketch(value)) {
    return compileSketchToMaker(value.getNode());
  }

  return compileToMaker(value.getNode());
};

export const isMakerModelLike = (value: unknown): value is IModel => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.keys(value).some((key) => MAKER_MODEL_KEYS.has(key));
};

export const normalizeEditorModelResult = (value: unknown): IModel => {
  if (isCadRenderable(value)) {
    return toMakerModel(value);
  }

  if (isMakerModelLike(value)) {
    return value;
  }

  throw new Error(
    'Editor code must return a Maker.js model or a cad shape, assembly, or sketch'
  );
};

const createPrimitiveNode = <TNode extends PrimitiveNode>(
  node: TNode
): Shape2D => new Shape2D(node);

const createOuterRect = (
  width: number,
  height: number,
  radius: number
): Shape2D =>
  radius > 0
    ? asShape(cad.roundRect(width, height, radius).getNode())
    : asShape(cad.rect(width, height).getNode());

const buildFrame = (
  width: number,
  height: number,
  thickness: number,
  radius = 0
): Shape2D => {
  assertPositiveNumber(width, 'width');
  assertPositiveNumber(height, 'height');
  assertPositiveNumber(thickness, 'thickness');
  assertNonNegativeNumber(radius, 'radius');

  const innerWidth = width - thickness * 2;
  const innerHeight = height - thickness * 2;

  if (innerWidth <= 0 || innerHeight <= 0) {
    throw new Error('thickness leaves no remaining frame body');
  }

  const innerRadius = Math.max(
    0,
    Math.min(
      internalNumber(radius - thickness),
      Math.min(innerWidth, innerHeight) / 2
    )
  );

  const outer = createOuterRect(width, height, radius);
  const inner =
    innerRadius > 0
      ? cad.roundRect(innerWidth, innerHeight, innerRadius)
      : cad.rect(innerWidth, innerHeight);

  return outer.cut(inner.translate(thickness, thickness));
};

const internalNumber = (value: number): number =>
  Number.isFinite(value) ? value : 0;

const buildPanel = (options: PanelOptions): Assembly2D => {
  const radius = options.radius ?? 0;
  const clearance = options.clearance ?? 0;
  const hasEdgeProfiles = Object.values(options.edges ?? {}).some(
    (edge) => edge && edge.kind !== 'plain'
  );

  validatePanelEdges(
    options.width,
    options.height,
    radius,
    options.edges,
    options.thickness,
    clearance
  );

  const bodyBase =
    hasEdgeProfiles && radius === 0
      ? buildPanelEdgeContour(
          options.width,
          options.height,
          options.edges,
          options.thickness,
          clearance
        )
      : createOuterRect(options.width, options.height, radius);
  const body = (options.holes ?? []).reduce((current, hole) => {
    const cutout =
      hole.kind === 'circle'
        ? buildCircleHole(hole)
        : buildSlotHole(hole as SlotHoleSpec);

    return current.cut(cutout);
  }, bodyBase);

  const children: Record<string, Shape2D | Assembly2D> = {
    body,
  };

  if (options.inset) {
    children.inset = buildPanelInset(
      options.width,
      options.height,
      options.inset
    );
  }

  return createAssemblyEntity(children, 'body');
};

const buildTrackPath = (
  points: readonly Point2D[],
  width: number,
  closed = false
): Shape2D => {
  const minPoints = closed ? 3 : 2;

  if (points.length < minPoints) {
    throw new Error(
      `Track requires at least ${minPoints} points when closed=${closed}`
    );
  }

  assertPositiveNumber(width, 'width');
  points.forEach((point, index) => validatePoint(point, index));

  const circles = points.map((point) =>
    cad.circle(width / 2).moveTo(point, 'center')
  );
  const segments = points
    .slice(1)
    .map((point, index) =>
      asShape(
        createModelNode(
          buildSlotModel(clonePoint(points[index]), clonePoint(point), width)
        )
      )
    );

  if (closed) {
    segments.push(
      asShape(
        createModelNode(
          buildSlotModel(
            clonePoint(points[points.length - 1]),
            clonePoint(points[0]),
            width
          )
        )
      )
    );
  }

  return unionMany([...circles, ...segments]);
};

const buildSpokeWheel = (options: SpokeWheelOptions): Shape2D => {
  assertPositiveNumber(options.outerRadius, 'outerRadius');
  assertPositiveNumber(options.innerRadius, 'innerRadius');
  assertPositiveInteger(options.spokes, 'spokes');

  if (options.innerRadius >= options.outerRadius) {
    throw new Error('innerRadius must be smaller than outerRadius');
  }

  const hubRadius = options.hubRadius ?? options.innerRadius * 0.4;
  const spokeWidth =
    options.spokeWidth ?? Math.max(4, options.outerRadius * 0.12);
  const bore = options.bore ?? 0;

  assertNonNegativeNumber(hubRadius, 'hubRadius');
  assertPositiveNumber(spokeWidth, 'spokeWidth');
  assertNonNegativeNumber(bore, 'bore');

  if (hubRadius >= options.innerRadius) {
    throw new Error('hubRadius must be smaller than innerRadius');
  }

  const rim = asShape(
    cad.ring(options.outerRadius, options.innerRadius).getNode()
  );
  const spokeLength = options.innerRadius - hubRadius;
  const spoke = cad
    .rect(spokeLength, spokeWidth)
    .moveTo([hubRadius + spokeLength / 2, 0], 'center');
  const spokes = spoke.polarArray(options.spokes, 360 / options.spokes, {
    rotateItems: true,
  });

  let wheel = asShape(rim.union(cad.circle(hubRadius)).union(spokes).getNode());

  if (bore > 0) {
    wheel = wheel.cut(cad.circle(bore / 2));
  }

  return wheel;
};

const buildGear = (options: GearOptions): Shape2D => {
  const outline = asShape(
    cad.polyline(buildGearPoints(options), { closed: true }).getNode()
  );
  const bore = options.bore ?? 0;

  if (bore <= 0) {
    return outline;
  }

  assertNonNegativeNumber(bore, 'bore');

  return outline.cut(cad.circle(bore / 2));
};

const buildClockFace = (options: ClockFaceOptions): Assembly2D => {
  assertPositiveNumber(options.radius, 'radius');

  const rimWidth = options.rimWidth ?? Math.max(6, options.radius * 0.12);
  const tickCount = options.tickCount ?? 12;
  const tickLength = options.tickLength ?? Math.max(8, options.radius * 0.16);
  const tickWidth = options.tickWidth ?? Math.max(2, options.radius * 0.04);
  const centerHole = options.centerHole ?? 0;

  assertPositiveNumber(rimWidth, 'rimWidth');
  assertPositiveInteger(tickCount, 'tickCount');
  assertPositiveNumber(tickLength, 'tickLength');
  assertPositiveNumber(tickWidth, 'tickWidth');
  assertNonNegativeNumber(centerHole, 'centerHole');

  let body = asShape(cad.circle(options.radius).getNode());

  if (centerHole > 0) {
    body = body.cut(cad.circle(centerHole / 2));
  }

  const rim = cad
    .ring(options.radius, Math.max(options.radius - rimWidth, centerHole / 2))
    .onLayer(DEFAULT_ETCH_LAYER);
  const tick = cad
    .rect(tickLength, tickWidth)
    .moveTo([options.radius - tickLength / 2, 0], 'center');
  const ticks = tick
    .polarArray(tickCount, 360 / tickCount, { rotateItems: true })
    .onLayer(DEFAULT_ETCH_LAYER);

  return createAssemblyEntity(
    {
      body,
      rim,
      ticks,
    },
    'body'
  );
};

const buildFlatLayout = (
  parts: Record<string, Shape2DLike | Assembly2DLike>,
  options: FlatLayoutOptions
): SketchLike => {
  assertPositiveInteger(options.columns, 'columns');
  assertNonNegativeNumber(options.gapX, 'gapX');
  assertNonNegativeNumber(options.gapY, 'gapY');

  const entries = Object.entries(parts);

  if (entries.length === 0) {
    throw new Error('flatLayout requires at least one part');
  }

  const laidOutParts: Record<string, Shape2DLike | Assembly2DLike> = {};
  let cursorX = 0;
  let cursorY = 0;
  let currentRowHeight = 0;

  entries.forEach(([childId, child], index) => {
    validateChildId(childId);

    if (index > 0 && index % options.columns === 0) {
      cursorX = 0;
      cursorY += currentRowHeight + options.gapY;
      currentRowHeight = 0;
    }

    const bounds = getPlacementBounds(child.getNode());
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const translatedChild = child.translate(
      cursorX - bounds.minX,
      cursorY - bounds.minY
    );

    laidOutParts[childId] = translatedChild;
    cursorX += width + options.gapX;
    currentRowHeight = Math.max(currentRowHeight, height);
  });

  return cad.sketch(laidOutParts);
};

export const cad: CadRuntime & {
  assembly(children: Record<string, Shape2DLike | Assembly2DLike>): Assembly2D;
  sketch(children: Record<string, Shape2DLike | Assembly2DLike>): Sketch;
  compileToMaker(value: CadRenderable): IModel;
} = Object.freeze({
  rect(width: number, height: number) {
    assertPositiveNumber(width, 'width');
    assertPositiveNumber(height, 'height');

    return createPrimitiveNode({
      kind: 'rect',
      width,
      height,
      metadata: EMPTY_METADATA,
    });
  },

  circle(radius: number) {
    assertPositiveNumber(radius, 'radius');

    return createPrimitiveNode({
      kind: 'circle',
      radius,
      metadata: EMPTY_METADATA,
    });
  },

  ring(outerRadius: number, innerRadius: number) {
    assertPositiveNumber(outerRadius, 'outerRadius');
    assertNonNegativeNumber(innerRadius, 'innerRadius');

    if (innerRadius >= outerRadius) {
      throw new Error('innerRadius must be smaller than outerRadius');
    }

    return asShape(
      createModelNode(new makerjs.models.Ring(outerRadius, innerRadius))
    );
  },

  roundRect(width: number, height: number, radius: number) {
    assertPositiveNumber(width, 'width');
    assertPositiveNumber(height, 'height');
    assertNonNegativeNumber(radius, 'radius');

    if (radius > Math.min(width, height) / 2) {
      throw new Error('radius cannot exceed half of the shortest side');
    }

    return createPrimitiveNode({
      kind: 'roundRect',
      width,
      height,
      radius,
      metadata: EMPTY_METADATA,
    });
  },

  capsule(width: number, height: number) {
    assertPositiveNumber(width, 'width');
    assertPositiveNumber(height, 'height');

    return cad.roundRect(width, height, Math.min(width, height) / 2);
  },

  slot(length: number, width: number) {
    assertPositiveNumber(length, 'length');
    assertPositiveNumber(width, 'width');

    if (length < width) {
      throw new Error('length must be greater than or equal to width');
    }

    const radius = width / 2;
    const halfSpan = Math.max(0, (length - width) / 2);
    const model = new makerjs.models.Slot(
      [-halfSpan, 0],
      [halfSpan, 0],
      radius
    );

    return asShape(createModelNode(model));
  },

  polyline(points: readonly Point2D[], options?: { closed?: boolean }) {
    const closed = options?.closed ?? false;
    const minPoints = closed ? 3 : 2;

    if (points.length < minPoints) {
      throw new Error(
        `Polyline requires at least ${minPoints} points when closed=${closed}`
      );
    }

    points.forEach((point, index) => validatePoint(point, index));

    return createPrimitiveNode({
      kind: 'polyline',
      points: points.map((point) => clonePoint(point)),
      closed,
      metadata: EMPTY_METADATA,
    });
  },

  trackPath(
    points: readonly Point2D[],
    width: number,
    options?: { closed?: boolean }
  ) {
    return buildTrackPath(points, width, options?.closed ?? false);
  },

  frame(
    width: number,
    height: number,
    thickness: number,
    options?: { radius?: number }
  ) {
    return buildFrame(width, height, thickness, options?.radius ?? 0);
  },

  panel(options: PanelOptions) {
    return buildPanel(options);
  },

  spokeWheel(options: SpokeWheelOptions) {
    return buildSpokeWheel(options);
  },

  gear(options: GearOptions) {
    return buildGear(options);
  },

  clockFace(options: ClockFaceOptions) {
    return buildClockFace(options);
  },

  fromSvgPathData(pathData: string, options?: SvgPathImportOptions) {
    const normalizedPathData = pathData.trim();

    if (!normalizedPathData) {
      throw new Error('pathData cannot be empty');
    }

    const model = makerjs.importer.fromSVGPathData(normalizedPathData, {
      bezierAccuracy: options?.bezierAccuracy,
    });

    return asShape(createModelNode(model));
  },

  flatLayout(
    parts: Record<string, Shape2DLike | Assembly2DLike>,
    options: FlatLayoutOptions
  ) {
    return buildFlatLayout(parts, options);
  },

  assembly(children: Record<string, Shape2DLike | Assembly2DLike>) {
    return createAssemblyEntity(children);
  },

  sketch(children: Record<string, Shape2DLike | Assembly2DLike>) {
    return new Sketch({
      kind: 'sketch',
      children: createChildrenMap(children),
      metadata: EMPTY_METADATA,
    });
  },

  compileToMaker(value: CadRenderable) {
    return toMakerModel(value);
  },
});
