import makerjs, { IMeasureWithCenter, IModel, IModelMap } from 'makerjs';

interface PackingNode {
  x: number;
  y: number;
  w: number;
  h: number;
  used?: boolean;
  right?: PackingNode;
  down?: PackingNode;
}

interface ModelWithSize {
  id: string;
  model: IModel;
  width: number;
  height: number;
  extents: IMeasureWithCenter;
}

function findNode(root: PackingNode, w: number, h: number): PackingNode | null {
  if (root.used) {
    const rightNode = root.right ? findNode(root.right, w, h) : null;
    return rightNode || (root.down ? findNode(root.down, w, h) : null);
  } else if (w <= root.w && h <= root.h) {
    return root;
  }
  return null;
}

function splitNode(node: PackingNode, w: number, h: number): PackingNode {
  node.used = true;
  node.down = { x: node.x, y: node.y + h, w: node.w, h: node.h - h };
  node.right = { x: node.x + w, y: node.y, w: node.w - w, h: h };
  return node;
}

export function packModelsIntoNestingArea(
  nestingArea: IModel,
  modelsToNest: IModelMap
) {
  // Get nesting area bounds
  const nestingExtents = makerjs.measure.modelExtents(nestingArea);
  const containerWidth = nestingExtents.high[0] - nestingExtents.low[0];
  const containerHeight = nestingExtents.high[1] - nestingExtents.low[1];

  // Prepare models with sizes
  const modelsWithSizes: ModelWithSize[] = Object.entries(modelsToNest).map(
    ([id, model]) => {
      const extents = makerjs.measure.modelExtents(model);

      return {
        id,
        model,
        width: extents.high[0] - extents.low[0],
        height: extents.high[1] - extents.low[1],
        extents,
      };
    }
  );

  modelsWithSizes.sort((a, b) => b.height - a.height);

  const root: PackingNode = {
    x: 0,
    y: 0,
    w: containerWidth,
    h: containerHeight,
  };

  const packedModels: IModelMap = {};
  const didNotFitModels: IModelMap = {};

  modelsWithSizes.forEach((item) => {
    const node = findNode(root, item.width, item.height);

    if (node) {
      const fit = splitNode(node, item.width, item.height);

      const targetX = nestingExtents.low[0] + fit.x;
      const targetY = nestingExtents.low[1] + fit.y;
      const moveX = targetX - item.extents.low[0];
      const moveY = targetY - item.extents.low[1];

      makerjs.model.move(item.model, [moveX, moveY]);
      packedModels[item.id] = item.model;
    } else {
      console.warn(`Model ${item.id} doesn't fit in nesting area`);
      didNotFitModels[item.id] = item.model;
    }
  });

  return { packedModels, didNotFitModels };
}
