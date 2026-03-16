import makerjs, { IModel } from 'makerjs';
import type {
  AssemblyNode,
  BooleanNode,
  CircleNode,
  EntityNode,
  MirrorAxis,
  NodeMetadata,
  Point2D,
  PolylineNode,
  PrimitiveNode,
  RectNode,
  RoundRectNode,
  SketchNode,
  TransformNode,
} from './types';

const clonePoint = (point: Point2D): makerjs.IPoint => [point[0], point[1]];

const applyMetadata = (model: IModel, metadata: NodeMetadata): IModel => {
  if (metadata.layer) {
    makerjs.model.layer(model, metadata.layer);
  }

  return model;
};

const compileRectNode = (node: RectNode): IModel =>
  new makerjs.models.Rectangle(node.width, node.height);

const compileCircleNode = (node: CircleNode): IModel => {
  const model = new makerjs.models.Oval(node.radius * 2, node.radius * 2);

  makerjs.model.moveRelative(model, [-node.radius, -node.radius]);

  return model;
};

const compileRoundRectNode = (node: RoundRectNode): IModel =>
  new makerjs.models.RoundRectangle(node.width, node.height, node.radius);

const compilePolylineNode = (node: PolylineNode): IModel => {
  const paths = Object.fromEntries(
    node.points
      .slice(1)
      .map((point, index) => [
        `p${index + 1}`,
        new makerjs.paths.Line(
          clonePoint(node.points[index]),
          clonePoint(point)
        ),
      ])
  );

  if (node.closed) {
    paths[`p${node.points.length}`] = new makerjs.paths.Line(
      clonePoint(node.points[node.points.length - 1]),
      clonePoint(node.points[0])
    );
  }

  return { paths };
};

const mirrorEntityModel = (model: IModel, axis: MirrorAxis): IModel => {
  if (axis === 'x') {
    return makerjs.model.mirror(model, true, false);
  }

  return makerjs.model.mirror(model, false, true);
};

const scaleAroundOrigin = (
  model: IModel,
  factor: number,
  origin?: Point2D
): IModel => {
  if (!origin) {
    makerjs.model.scale(model, factor);
    return model;
  }

  makerjs.model.moveRelative(model, [-origin[0], -origin[1]]);
  makerjs.model.scale(model, factor);
  makerjs.model.moveRelative(model, [origin[0], origin[1]]);

  return model;
};

const compilePrimitiveNode = (node: PrimitiveNode): IModel => {
  switch (node.kind) {
    case 'rect':
      return compileRectNode(node);
    case 'circle':
      return compileCircleNode(node);
    case 'roundRect':
      return compileRoundRectNode(node);
    case 'polyline':
      return compilePolylineNode(node);
  }
};

const compileBooleanNode = (node: BooleanNode): IModel => {
  const left = compileToMaker(node.left);
  const right = compileToMaker(node.right);

  switch (node.operation) {
    case 'union':
      return makerjs.model.combineUnion(left, right);
    case 'cut':
      return makerjs.model.combineSubtraction(left, right);
    case 'intersect':
      return makerjs.model.combineIntersection(left, right);
  }
};

const compileTransformNode = (node: TransformNode): IModel => {
  const model = compileToMaker(node.child);

  switch (node.transform.type) {
    case 'translate':
      makerjs.model.moveRelative(model, [node.transform.x, node.transform.y]);
      return model;
    case 'rotate':
      makerjs.model.rotate(
        model,
        node.transform.angleDeg,
        node.transform.origin ? clonePoint(node.transform.origin) : undefined
      );
      return model;
    case 'scale':
      return scaleAroundOrigin(
        model,
        node.transform.factor,
        node.transform.origin
      );
    case 'mirror':
      return mirrorEntityModel(model, node.transform.axis);
  }
};

const compileAssemblyNode = (node: AssemblyNode): IModel => {
  const models = Object.fromEntries(
    Object.entries(node.children).map(([childId, childNode]) => [
      childId,
      compileToMaker(childNode),
    ])
  );

  return { models };
};

export const compileToMaker = (node: EntityNode): IModel => {
  let model: IModel;

  switch (node.kind) {
    case 'rect':
    case 'circle':
    case 'roundRect':
    case 'polyline':
      model = compilePrimitiveNode(node);
      break;
    case 'boolean':
      model = compileBooleanNode(node);
      break;
    case 'transform':
      model = compileTransformNode(node);
      break;
    case 'assembly':
      model = compileAssemblyNode(node);
      break;
  }

  return applyMetadata(model, node.metadata);
};

export const compileSketchToMaker = (node: SketchNode): IModel =>
  applyMetadata(
    {
      models: Object.fromEntries(
        Object.entries(node.children).map(([childId, childNode]) => [
          childId,
          compileToMaker(childNode),
        ])
      ),
    },
    node.metadata
  );
