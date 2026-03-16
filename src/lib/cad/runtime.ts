import type { IModel } from 'makerjs';
import { compileSketchToMaker, compileToMaker } from './compiler';
import type {
  Assembly2DLike,
  CadRuntime,
  EntityNode,
  MirrorAxis,
  NodeMetadata,
  Point2D,
  PrimitiveNode,
  Shape2DLike,
  SketchNode,
  SketchLike,
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

const validatePoint = (point: Point2D, index: number): void => {
  if (!Array.isArray(point) || point.length !== 2) {
    throw new Error(`Point at index ${index} must be a tuple of [x, y]`);
  }

  assertFiniteNumber(point[0], `Point ${index} x`);
  assertFiniteNumber(point[1], `Point ${index} y`);
};

const validateChildId = (childId: string): void => {
  if (!childId.trim()) {
    throw new Error('Child ids cannot be empty');
  }
};

const createChildrenMap = (
  children: Record<string, Shape2DLike | Assembly2DLike>
): Readonly<Record<string, EntityNode>> =>
  Object.fromEntries(
    Object.entries(children).map(([childId, child]) => {
      validateChildId(childId);
      return [childId, child.getNode()];
    })
  );

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
      points: points.map((point) => [point[0], point[1]] as Point2D),
      closed,
      metadata: EMPTY_METADATA,
    });
  },

  assembly(children: Record<string, Shape2DLike | Assembly2DLike>) {
    return new Assembly2D({
      kind: 'assembly',
      children: createChildrenMap(children),
      metadata: EMPTY_METADATA,
    });
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
