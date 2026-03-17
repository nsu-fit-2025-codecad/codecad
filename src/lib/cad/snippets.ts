export interface CadSnippet {
  title: string;
  code: string;
  editorCode: string;
}

const defineSnippet = (
  title: string,
  code: string,
  editorCode = code
): CadSnippet => ({
  title,
  code,
  editorCode,
});

export const CAD_SNIPPETS = {
  quickStart: defineSnippet(
    'Быстрый старт',
    `const plate = cad.roundRect(140, 90, 14).onLayer('cut');
const hole = cad.circle(6).centerAt([35, 45]);

return cad.sketch({
  plate: plate.cut(hole)
});`
  ),
  primitiveRect: defineSnippet(
    'Прямоугольник',
    `return cad.sketch({
  rectA: cad.rect(120, 80)
});`
  ),
  primitiveCircle: defineSnippet(
    'Круг',
    `return cad.sketch({
  circleA: cad.circle(28).centerAt([40, 40])
});`
  ),
  primitiveRing: defineSnippet(
    'Кольцо',
    `return cad.sketch({
  ringA: cad.ring(42, 18).centerAt([52, 52])
});`
  ),
  primitiveRoundRect: defineSnippet(
    'Скруглённый прямоугольник',
    `return cad.sketch({
  plate: cad.roundRect(150, 90, 16)
});`
  ),
  primitiveCapsule: defineSnippet(
    'Капсула',
    `return cad.sketch({
  handle: cad.capsule(140, 50).translate(10, 10)
});`
  ),
  primitiveSlot: defineSnippet(
    'Паз',
    `return cad.sketch({
  slotA: cad.slot(100, 18).translate(10, 20)
});`
  ),
  primitivePolyline: defineSnippet(
    'Полилиния',
    `return cad.sketch({
  contour: cad.polyline(
    [
      [0, 20],
      [40, 0],
      [90, 0],
      [120, 40],
      [60, 80],
      [0, 60]
    ],
    { closed: true }
  )
});`
  ),
  primitiveTrackPath: defineSnippet(
    'Широкая дорожка',
    `return cad.sketch({
  maze: cad.trackPath(
    [
      [0, 0],
      [60, 0],
      [60, 30],
      [25, 30],
      [25, 65],
      [85, 65]
    ],
    10
  ).onLayer('etch')
});`,
    'const ${1:maze} = cad.trackPath(\n  [\n    [${2:0}, ${3:0}],\n    [${4:60}, ${5:0}],\n    [${6:60}, ${7:30}],\n    [${8:25}, ${9:30}]\n  ], ${10:10}\n);'
  ),
  transformTranslate: defineSnippet(
    'Сдвиг',
    `return cad.sketch({
  shifted: cad.roundRect(110, 60, 12).translate(20, 25)
});`
  ),
  transformRotate: defineSnippet(
    'Поворот',
    `return cad.sketch({
  rotated: cad.slot(90, 18).centerAt([60, 45]).rotate(25, [60, 45])
});`
  ),
  transformScale: defineSnippet(
    'Масштаб',
    `return cad.sketch({
  scaled: cad.circle(18).centerAt([30, 30]).scale(1.6, [30, 30])
});`
  ),
  transformMirror: defineSnippet(
    'Зеркалирование',
    `const half = cad.polyline(
  [
    [0, 0],
    [50, 0],
    [70, 20],
    [50, 40],
    [0, 40]
  ],
  { closed: true }
);

return cad.sketch({
  left: half.translate(10, 10),
  right: half.mirror('y').translate(150, 10)
});`
  ),
  transformMoveTo: defineSnippet(
    'moveTo',
    `return cad.sketch({
  marker: cad.circle(12).moveTo([80, 40], 'center')
});`
  ),
  transformCenterAt: defineSnippet(
    'centerAt',
    `return cad.sketch({
  gear: cad.gear({
    teeth: 14,
    outerRadius: 34,
    rootRadius: 25,
    bore: 10
  }).centerAt([45, 45])
});`
  ),
  transformAlignTo: defineSnippet(
    'alignTo',
    `const frame = cad.roundRect(140, 80, 14);
const badge = cad.circle(10).alignTo(frame, 'center', 'topRight');

return cad.sketch({
  frame,
  badge
});`
  ),
  booleanUnion: defineSnippet(
    'union',
    `const circle = cad.circle(22).centerAt([40, 40]);
const bar = cad.rect(60, 24).centerAt([40, 40]);

return cad.sketch({
  badge: circle.union(bar)
});`
  ),
  booleanCut: defineSnippet(
    'cut',
    `const plate = cad.roundRect(150, 90, 16);
const windowShape = cad.roundRect(60, 30, 8).centerAt([75, 45]);

return cad.sketch({
  plate: plate.cut(windowShape)
});`
  ),
  booleanIntersect: defineSnippet(
    'intersect',
    `const circle = cad.circle(32).centerAt([45, 45]);
const box = cad.rect(70, 40).centerAt([45, 45]);

return cad.sketch({
  overlap: circle.intersect(box)
});`
  ),
  compositionAssembly: defineSnippet(
    'assembly',
    `return cad.sketch({
  clamp: cad.assembly({
    body: cad.roundRect(120, 70, 12),
    hole: cad.circle(8).centerAt([28, 35]),
    slot: cad.slot(40, 10).centerAt([82, 35])
  })
});`
  ),
  compositionSketch: defineSnippet(
    'sketch',
    `return cad.sketch({
  base: cad.rect(100, 60),
  marker: cad.circle(8).centerAt([20, 20]),
  cutout: cad.slot(40, 12).centerAt([70, 30])
});`
  ),
  compositionCompileToMaker: defineSnippet(
    'compileToMaker',
    `const plate = cad.roundRect(120, 80, 12).onLayer('cut');

return cad.compileToMaker(plate);`
  ),
  patternArray: defineSnippet(
    'array',
    `return cad.sketch({
  holes: cad.circle(6).centerAt([12, 12]).array(5, 24)
});`
  ),
  patternGrid: defineSnippet(
    'grid',
    `return cad.sketch({
  holes: cad.circle(5).centerAt([10, 10]).grid(4, 3, 28, 24)
});`
  ),
  patternPolarArray: defineSnippet(
    'polarArray',
    `const tooth = cad.slot(18, 6).centerAt([60, 16]);

return cad.sketch({
  pattern: tooth.polarArray(10, 36, {
    origin: [60, 60],
    rotateItems: true
  })
});`
  ),
  helperFrame: defineSnippet(
    'frame',
    `return cad.sketch({
  frame: cad.frame(160, 100, 18, { radius: 12 })
});`
  ),
  helperPanel: defineSnippet(
    'panel',
    `return cad.sketch({
  side: cad.panel({
    width: 120,
    height: 82,
    thickness: 3,
    clearance: 0.15,
    edges: {
      top: { kind: 'notches', count: 2, segmentLength: 24 },
      bottom: { kind: 'notches', count: 2, segmentLength: 24 },
      left: { kind: 'tabs', count: 2, segmentLength: 18 },
      right: { kind: 'tabs', count: 2, segmentLength: 18 }
    },
    holes: [
      { kind: 'circle', x: 18, y: 18, radius: 3 },
      { kind: 'circle', x: 102, y: 18, radius: 3 }
    ]
  }).onLayer('cut')
});`,
    "const ${1:panel} = cad.panel({\n  width: ${2:120},\n  height: ${3:82},\n  thickness: ${4:3},\n  clearance: ${5:0.15},\n  edges: {\n    top: { kind: 'notches', count: ${6:2}, segmentLength: ${7:24} },\n    bottom: { kind: 'notches', count: ${8:2}, segmentLength: ${9:24} },\n    left: { kind: 'tabs', count: ${10:2}, segmentLength: ${11:18} },\n    right: { kind: 'tabs', count: ${12:2}, segmentLength: ${13:18} }\n  }\n});"
  ),
  helperFlatLayout: defineSnippet(
    'flatLayout',
    `const thickness = 3;
const clearance = 0.15;
const boxWidth = 168;
const boxDepth = 112;
const boxHeight = 96;

function wallPanel(width, sideKind) {
  return cad.panel({
    width,
    height: boxHeight,
    thickness,
    clearance,
    edges: {
      top: { kind: 'notches', count: 3, segmentLength: 24, inset: 8 },
      bottom: { kind: 'notches', count: 3, segmentLength: 24, inset: 8 },
      left: { kind: sideKind, count: 2, segmentLength: 18, inset: 10 },
      right: { kind: sideKind, count: 2, segmentLength: 18, inset: 10 }
    }
  });
}

function horizontalPanel(withHandle) {
  let panel = cad.panel({
    width: boxWidth,
    height: boxDepth,
    thickness,
    clearance,
    edges: {
      top: { kind: 'tabs', count: 3, segmentLength: 24, inset: 8 },
      bottom: { kind: 'tabs', count: 3, segmentLength: 24, inset: 8 },
      left: { kind: 'tabs', count: 2, segmentLength: 18, inset: 10 },
      right: { kind: 'tabs', count: 2, segmentLength: 18, inset: 10 }
    }
  });

  if (withHandle) {
    panel = panel
      .cut(cad.slot(56, 12).centerAt([boxWidth / 2, 24]))
      .cut(cad.slot(44, 6).centerAt([boxWidth * 0.25, boxDepth - 12]))
      .cut(cad.slot(44, 6).centerAt([boxWidth * 0.75, boxDepth - 12]));
  }

  return panel;
}

const front = wallPanel(boxWidth, 'tabs')
  .cut(cad.slot(52, 8).centerAt([boxWidth / 2, boxHeight - 12]));

const back = wallPanel(boxWidth, 'tabs');
const leftSide = wallPanel(boxDepth, 'notches');
const rightSide = wallPanel(boxDepth, 'notches')
  .cut(cad.slot(44, 10).centerAt([boxDepth / 2, 24]));

const bottom = horizontalPanel(false);
const lid = horizontalPanel(true);

return cad.flatLayout(
  {
    front,
    back,
    leftSide,
    rightSide,
    bottom,
    lid
  },
  { columns: 2, gapX: 20, gapY: 20 }
);`
  ),
  helperSpokeWheel: defineSnippet(
    'spokeWheel',
    `return cad.sketch({
  wheel: cad.spokeWheel({
    outerRadius: 48,
    innerRadius: 18,
    spokes: 6,
    hubRadius: 10,
    bore: 6
  }).centerAt([60, 60])
});`
  ),
  helperGear: defineSnippet(
    'gear',
    `return cad.sketch({
  gear: cad.gear({
    teeth: 14,
    outerRadius: 34,
    rootRadius: 25,
    bore: 10
  }).centerAt([45, 45]).onLayer('cut')
});`,
    'const ${1:gear} = cad.gear({\n  teeth: ${2:14},\n  outerRadius: ${3:34},\n  rootRadius: ${4:25},\n  bore: ${5:10}\n}).centerAt([${6:45}, ${7:45}]);'
  ),
  helperClockFace: defineSnippet(
    'clockFace',
    `return cad.sketch({
  clock: cad.clockFace({
    radius: 42,
    rimWidth: 8,
    tickCount: 12,
    centerHole: 6
  })
});`,
    'const ${1:clock} = cad.clockFace({\n  radius: ${2:42},\n  rimWidth: ${3:8},\n  tickCount: ${4:12},\n  centerHole: ${5:6}\n});'
  ),
  helperFromSvgPathData: defineSnippet(
    'fromSvgPathData',
    `const badgePath = [
  'M 0 20',
  'C 0 5 18 0 30 12',
  'C 42 0 60 5 60 20',
  'C 60 36 46 48 30 60',
  'C 14 48 0 36 0 20',
  'Z'
].join(' ');

return cad.sketch({
  badge: cad.fromSvgPathData(badgePath).translate(10, 10)
});`
  ),
  defaultEditorScene: defineSnippet(
    'Стартовая сцена',
    `const boardWidth = 300;
const boardHeight = 220;
const rabbitPath = [
  'M 22 82',
  'C 18 65 23 54 33 46',
  'C 28 38 26 26 30 14',
  'C 33 6 38 6 42 15',
  'C 45 24 46 34 45 43',
  'C 49 41 53 41 57 43',
  'C 56 34 57 24 60 15',
  'C 64 6 69 6 72 14',
  'C 76 26 74 38 68 46',
  'C 79 53 84 64 80 82',
  'C 76 100 63 112 51 112',
  'C 37 112 25 101 22 82',
  'Z'
].join(' ');

const board = cad.roundRect(boardWidth, boardHeight, 24).onLayer('cut');

const door = cad
  .panel({
    width: 112,
    height: 84,
    radius: 14,
    inset: { margin: 16, radius: 8 },
    holes: [
      { kind: 'circle', x: 18, y: 18, radius: 3 },
      { kind: 'circle', x: 94, y: 18, radius: 3 },
      { kind: 'circle', x: 18, y: 66, radius: 3 },
      { kind: 'circle', x: 94, y: 66, radius: 3 }
    ]
  })
  .translate(18, 20);

const clock = cad.clockFace({
  radius: 44,
  rimWidth: 8,
  tickCount: 12,
  centerHole: 6
}).centerAt([228, 74]);

const maze = cad
  .trackPath(
    [
      [0, 18],
      [46, 18],
      [46, 0],
      [94, 0],
      [94, 34],
      [60, 34],
      [60, 68],
      [112, 68]
    ],
    12
  )
  .translate(150, 136)
  .onLayer('etch');

const rabbit = cad
  .fromSvgPathData(rabbitPath)
  .scale(0.72)
  .centerAt([262, 174])
  .onLayer('cut');

return cad.sketch({
  board,
  door,
  clock,
  maze,
  rabbit
});`
  ),
} as const satisfies Record<string, CadSnippet>;

export type CadSnippetId = keyof typeof CAD_SNIPPETS;

export const DEFAULT_EDITOR_SNIPPET_ID = 'defaultEditorScene';

export const getCadSnippet = (snippetId: CadSnippetId): CadSnippet =>
  CAD_SNIPPETS[snippetId];

export const getCadSnippetEditorCode = (snippetId: CadSnippetId): string =>
  CAD_SNIPPETS[snippetId].editorCode;
