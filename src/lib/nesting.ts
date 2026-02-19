import makerjs, { IModel, IModelMap } from 'makerjs';

const EPSILON = 1e-9;

interface PackingNode {
  x: number;
  y: number;
  w: number;
  h: number;
  used?: boolean;
  right?: PackingNode;
  down?: PackingNode;
}

interface PlacementScore {
  wasteArea: number;
  shortSide: number;
  longSide: number;
  y: number;
  x: number;
}

interface NodeFit {
  node: PackingNode;
  score: PlacementScore;
}

interface OrientationCandidate {
  rotated: boolean;
  width: number;
  height: number;
}

interface ModelWithSize {
  id: string;
  sourceModel: IModel;
  model: IModel;
  width: number;
  height: number;
}

export interface PackingOptions {
  gap?: number;
  allowRotation?: boolean;
}

function compareScores(a: PlacementScore, b: PlacementScore): number {
  if (Math.abs(a.wasteArea - b.wasteArea) > EPSILON) {
    return a.wasteArea - b.wasteArea;
  }

  if (Math.abs(a.shortSide - b.shortSide) > EPSILON) {
    return a.shortSide - b.shortSide;
  }

  if (Math.abs(a.longSide - b.longSide) > EPSILON) {
    return a.longSide - b.longSide;
  }

  if (Math.abs(a.y - b.y) > EPSILON) {
    return a.y - b.y;
  }

  return a.x - b.x;
}

function canFit(node: PackingNode, w: number, h: number): boolean {
  return w <= node.w + EPSILON && h <= node.h + EPSILON;
}

function findBestNode(root: PackingNode, w: number, h: number): NodeFit | null {
  const stack = [root];
  let best: NodeFit | null = null;

  while (stack.length > 0) {
    const node = stack.pop()!;

    if (node.used) {
      if (node.right) {
        stack.push(node.right);
      }
      if (node.down) {
        stack.push(node.down);
      }
      continue;
    }

    if (!canFit(node, w, h)) {
      continue;
    }

    const remainingW = Math.max(0, node.w - w);
    const remainingH = Math.max(0, node.h - h);

    const score: PlacementScore = {
      wasteArea: node.w * node.h - w * h,
      shortSide: Math.min(remainingW, remainingH),
      longSide: Math.max(remainingW, remainingH),
      y: node.y,
      x: node.x,
    };

    if (!best || compareScores(score, best.score) < 0) {
      best = { node, score };
    }
  }

  return best;
}

function createNode(
  x: number,
  y: number,
  w: number,
  h: number
): PackingNode | undefined {
  if (w <= EPSILON || h <= EPSILON) {
    return undefined;
  }

  return { x, y, w, h };
}

function splitNode(node: PackingNode, w: number, h: number): PackingNode {
  const dw = Math.max(0, node.w - w);
  const dh = Math.max(0, node.h - h);

  node.used = true;

  if (dw > dh) {
    node.right = createNode(node.x + w, node.y, dw, node.h);
    node.down = createNode(node.x, node.y + h, w, dh);
    return node;
  }

  node.right = createNode(node.x + w, node.y, dw, h);
  node.down = createNode(node.x, node.y + h, node.w, dh);

  return node;
}

export function packModelsIntoNestingArea(
  nestingArea: IModel,
  modelsToNest: IModelMap,
  options: PackingOptions = {}
) {
  const gap = Math.max(0, options.gap ?? 0);
  const allowRotation = options.allowRotation ?? true;

  // Get nesting area bounds
  const nestingExtents = makerjs.measure.modelExtents(nestingArea);
  const packedModels: IModelMap = {};
  const didNotFitModels: IModelMap = {};

  if (!nestingExtents) {
    return {
      packedModels,
      didNotFitModels: {
        ...didNotFitModels,
        ...modelsToNest,
      },
    };
  }

  const containerWidth = nestingExtents.high[0] - nestingExtents.low[0];
  const containerHeight = nestingExtents.high[1] - nestingExtents.low[1];

  if (containerWidth <= EPSILON || containerHeight <= EPSILON) {
    return {
      packedModels,
      didNotFitModels: {
        ...didNotFitModels,
        ...modelsToNest,
      },
    };
  }

  // Prepare models with sizes
  const modelsWithSizes: ModelWithSize[] = [];

  Object.entries(modelsToNest).forEach(([id, model]) => {
    const extents = makerjs.measure.modelExtents(model);

    if (!extents) {
      didNotFitModels[id] = model;
      return;
    }

    const width = extents.high[0] - extents.low[0];
    const height = extents.high[1] - extents.low[1];

    if (width <= EPSILON || height <= EPSILON) {
      didNotFitModels[id] = model;
      return;
    }

    modelsWithSizes.push({
      id,
      sourceModel: model,
      model: makerjs.model.clone(model),
      width,
      height,
    });
  });

  modelsWithSizes.sort((a, b) => {
    const maxSideDiff =
      Math.max(b.width, b.height) - Math.max(a.width, a.height);

    if (Math.abs(maxSideDiff) > EPSILON) {
      return maxSideDiff;
    }

    const areaDiff = b.width * b.height - a.width * a.height;

    if (Math.abs(areaDiff) > EPSILON) {
      return areaDiff;
    }

    return b.height - a.height;
  });

  const root: PackingNode = {
    x: 0,
    y: 0,
    w: containerWidth,
    h: containerHeight,
  };

  modelsWithSizes.forEach((item) => {
    const baseOrientations: OrientationCandidate[] = [
      {
        rotated: false,
        width: item.width + gap * 2,
        height: item.height + gap * 2,
      },
    ];

    if (allowRotation && Math.abs(item.width - item.height) > EPSILON) {
      baseOrientations.push({
        rotated: true,
        width: item.height + gap * 2,
        height: item.width + gap * 2,
      });
    }

    let selectedPlacement:
      | {
          fit: NodeFit;
          orientation: OrientationCandidate;
        }
      | undefined;

    baseOrientations.forEach((orientation) => {
      const fit = findBestNode(root, orientation.width, orientation.height);

      if (!fit) {
        return;
      }

      if (!selectedPlacement) {
        selectedPlacement = { fit, orientation };
        return;
      }

      if (compareScores(fit.score, selectedPlacement.fit.score) < 0) {
        selectedPlacement = { fit, orientation };
      }
    });

    if (selectedPlacement) {
      if (selectedPlacement.orientation.rotated) {
        makerjs.model.rotate(item.model, 90, [0, 0]);
      }

      const packedExtents = makerjs.measure.modelExtents(item.model);

      if (!packedExtents) {
        console.warn(
          `Model ${item.id} has empty extents after transformations`
        );
        didNotFitModels[item.id] = item.sourceModel;
        return;
      }

      const fit = splitNode(
        selectedPlacement.fit.node,
        selectedPlacement.orientation.width,
        selectedPlacement.orientation.height
      );

      const targetX = nestingExtents.low[0] + fit.x + gap;
      const targetY = nestingExtents.low[1] + fit.y + gap;
      const moveX = targetX - packedExtents.low[0];
      const moveY = targetY - packedExtents.low[1];

      makerjs.model.moveRelative(item.model, [moveX, moveY]);
      packedModels[item.id] = item.model;
    } else {
      console.warn(`Model ${item.id} doesn't fit in nesting area`);
      didNotFitModels[item.id] = item.sourceModel;
    }
  });

  return { packedModels, didNotFitModels };
}

export interface PackModelsIntoTargetModelResult {
  packedIds: Set<string>;
  notFitIds: Set<string>;
  svgString: string;
}

export function packModelsIntoTargetModel(
  model: IModel | null,
  targetModelId: string,
  options: PackingOptions = {}
): PackModelsIntoTargetModelResult | null {
  if (!model || !model.models) {
    return null;
  }

  const nestingArea = model.models[targetModelId];

  if (!nestingArea) {
    return null;
  }

  const modelsToNest: IModelMap = {};

  Object.entries(model.models).forEach(([modelId, nestingCandidate]) => {
    if (modelId === targetModelId) {
      return;
    }

    modelsToNest[modelId] = nestingCandidate;
  });

  if (Object.keys(modelsToNest).length === 0) {
    return null;
  }

  const { packedModels, didNotFitModels } = packModelsIntoNestingArea(
    nestingArea,
    modelsToNest,
    options
  );

  model.models = {
    [targetModelId]: nestingArea,
    ...packedModels,
    ...didNotFitModels,
  };

  return {
    packedIds: new Set(Object.keys(packedModels)),
    notFitIds: new Set(Object.keys(didNotFitModels)),
    svgString: makerjs.exporter.toSVG(model, {
      useSvgPathOnly: false,
    }),
  };
}
