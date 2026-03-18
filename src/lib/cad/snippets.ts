import type { Parameter } from '@/store/store';

export interface CadSnippet {
  title: string;
  code: string;
  editorCode: string;
  parameters?: Parameter[];
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

const withParameters = (
  snippet: CadSnippet,
  parameters: readonly Parameter[]
): CadSnippet => ({
  ...snippet,
  parameters: parameters.map((parameter) => ({ ...parameter })),
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
  editorFlatScene: defineSnippet(
    'Scene Layout',
    `const plate = cad
  .roundRect(120, 70, 12)
  .cut(cad.slot(52, 10).centerAt([60, 18]))
  .onLayer('cut');

const bracket = cad
  .panel({
    width: 64,
    height: 42,
    radius: 8,
    holes: [
      { kind: 'circle', x: 16, y: 21, radius: 4 },
      { kind: 'circle', x: 48, y: 21, radius: 4 }
    ]
  })
  .onLayer('cut');

const spacer = cad.ring(18, 8).centerAt([18, 18]).onLayer('cut');

return cad.flatLayout([plate, bracket, spacer], {
  columns: 2,
  gapX: 18,
  gapY: 18
});`
  ),
  demoMountingPlate: withParameters(
    defineSnippet(
      'Mounting Plate',
      `const mountingPlate = cad
  .panel({
    width: plateWidth,
    height: plateHeight,
    radius: plateRadius,
    holes: [
      { kind: 'circle', x: 18, y: 18, radius: 3.5 },
      { kind: 'circle', x: plateWidth - 18, y: 18, radius: 3.5 },
      { kind: 'circle', x: 18, y: plateHeight - 18, radius: 3.5 },
      { kind: 'circle', x: plateWidth - 18, y: plateHeight - 18, radius: 3.5 }
    ]
  })
  .cut(cad.slot(slotLength, 12).centerAt([plateWidth / 2, 28]))
  .cut(
    cad
      .roundRect(windowWidth, windowHeight, 8)
      .centerAt([plateWidth / 2, plateHeight - 38])
  )
  .cut(cad.circle(6).centerAt([plateWidth / 2, plateHeight - 38]))
  .onLayer('cut');

return cad.flatLayout(
  {
    mountingPlate
  },
  { columns: 1, gapX: 0, gapY: 0 }
);`
    ),
    [
      { name: 'plateWidth', value: 180, min: 120, max: 260, step: 1 },
      { name: 'plateHeight', value: 110, min: 80, max: 180, step: 1 },
      { name: 'plateRadius', value: 12, min: 4, max: 24, step: 1 },
      { name: 'slotLength', value: 68, min: 32, max: 120, step: 1 },
      { name: 'windowWidth', value: 46, min: 28, max: 80, step: 1 },
      { name: 'windowHeight', value: 30, min: 18, max: 60, step: 1 },
    ]
  ),
  demoBottleCarrierKit: withParameters(
    defineSnippet(
      'Bottle Carrier Kit',
      `const target = cad.roundRect(stockWidth, stockHeight, 12).onLayer('stock');
const bayWidth = dividerWidth + 20;
const sideWidth = bottleCount * bayWidth + 24;
const sideHeight = Math.max(84, Math.round(handleLength * 0.78));
const slotWidth = Math.max(8, Math.round(dividerWidth * 0.28) + slotClearance);
const dividerHeight = sideHeight - 12;
const dividerSlotDepth = Math.round(dividerHeight * 0.42);
const bottleRadius = Math.max(10, Math.round(dividerWidth * 0.38));

function carrierSide() {
  let side = cad
    .roundRect(sideWidth, sideHeight, 12)
    .cut(cad.slot(handleLength, 14).centerAt([sideWidth / 2, 20]))
    .cut(cad.circle(4).centerAt([18, 20]))
    .cut(cad.circle(4).centerAt([sideWidth - 18, 20]));

  for (let index = 0; index < bottleCount; index += 1) {
    const centerX = 12 + bayWidth * index + bayWidth / 2;

    side = side.cut(
      cad.circle(bottleRadius).centerAt([centerX, sideHeight + bottleRadius * 0.25])
    );
  }

  for (let index = 1; index < bottleCount; index += 1) {
    const slotX = 12 + bayWidth * index;

    side = side.cut(
      cad.rect(slotWidth, dividerSlotDepth).centerAt([
        slotX,
        sideHeight - dividerSlotDepth / 2
      ])
    );
  }

  return side.onLayer('cut');
}

function dividerPanel() {
  return cad
    .roundRect(dividerWidth, dividerHeight, 8)
    .cut(cad.rect(slotWidth, dividerSlotDepth).centerAt([dividerWidth / 2, dividerSlotDepth / 2]))
    .cut(cad.circle(5).centerAt([dividerWidth / 2, dividerHeight - 18]))
    .onLayer('cut');
}

const sides = Array.from({ length: 2 }, () => carrierSide());
const dividers = Array.from(
  { length: Math.max(2, bottleCount - 1) },
  () => dividerPanel()
);
const handle = cad
  .capsule(handleLength, 22)
  .cut(cad.slot(handleLength - 40, 8).centerAt([handleLength / 2, 11]))
  .onLayer('cut');

return cad.flatLayout(
  {
    target,
    side: sides,
    divider: dividers,
    handle
  },
  { columns: 3, gapX: 22, gapY: 20 }
);`
    ),
    [
      { name: 'stockWidth', value: 250, min: 180, max: 340, step: 1 },
      { name: 'stockHeight', value: 160, min: 120, max: 220, step: 1 },
      { name: 'bottleCount', value: 4, min: 3, max: 6, step: 1 },
      { name: 'dividerWidth', value: 34, min: 24, max: 52, step: 1 },
      { name: 'handleLength', value: 92, min: 64, max: 140, step: 1 },
      { name: 'slotClearance', value: 2, min: 0, max: 8, step: 1 },
    ]
  ),
  demoFanGuardPack: withParameters(
    defineSnippet(
      'Fan Guard Pack',
      `const target = cad.roundRect(stockWidth, stockHeight, 18).onLayer('stock');
const innerRadius = Math.max(guardRadius - ringThickness, capSize / 2 + 10);
const supportOuter = Math.max(capSize / 2 + ringThickness + 10, innerRadius - 6);
const supportInner = Math.max(capSize / 2 + 4, supportOuter - Math.max(8, ringThickness - 2));

function guardFrame() {
  const center = [guardRadius, guardRadius];
  const earCenter = [guardRadius * 2 - 10, guardRadius];
  let frame = cad
    .ring(guardRadius, innerRadius)
    .centerAt(center)
    .union(cad.roundRect(18, 12, 5).centerAt(earCenter))
    .union(cad.roundRect(18, 12, 5).centerAt(earCenter).rotate(90, center))
    .union(cad.roundRect(18, 12, 5).centerAt(earCenter).rotate(180, center))
    .union(cad.roundRect(18, 12, 5).centerAt(earCenter).rotate(270, center));

  frame = frame
    .cut(cad.circle(4).centerAt(earCenter))
    .cut(cad.circle(4).centerAt(earCenter).rotate(90, center))
    .cut(cad.circle(4).centerAt(earCenter).rotate(180, center))
    .cut(cad.circle(4).centerAt(earCenter).rotate(270, center));

  return frame.onLayer('cut');
}

function clip() {
  const clipLength = capSize + 20;

  return cad
    .capsule(clipLength, 18)
    .cut(cad.circle(8).centerAt([12, 9]))
    .cut(cad.rect(Math.max(12, Math.round(capSize * 0.5)), 10).centerAt([clipLength - 6, 9]))
    .onLayer('cut');
}

function cap() {
  return cad
    .roundRect(capSize, capSize, Math.max(6, Math.round(capSize * 0.24)))
    .cut(cad.circle(Math.max(4, Math.round(capSize * 0.18))).centerAt([capSize / 2, capSize / 2]))
    .onLayer('cut');
}

const guard = guardFrame();
const supportRing = cad
  .ring(supportOuter, supportInner)
  .centerAt([supportOuter, supportOuter])
  .onLayer('cut');
const clips = Array.from({ length: clipCount }, () => clip());
const caps = [cap(), cap()];

return cad.flatLayout(
  {
    target,
    guard: [guard, supportRing],
    clip: clips,
    cap: caps
  },
  { columns: 3, gapX: 20, gapY: 20 }
);`
    ),
    [
      { name: 'stockWidth', value: 250, min: 180, max: 320, step: 1 },
      { name: 'stockHeight', value: 180, min: 130, max: 240, step: 1 },
      { name: 'guardRadius', value: 52, min: 34, max: 76, step: 1 },
      { name: 'ringThickness', value: 12, min: 8, max: 20, step: 1 },
      { name: 'clipCount', value: 5, min: 3, max: 8, step: 1 },
      { name: 'capSize', value: 34, min: 20, max: 54, step: 1 },
    ]
  ),
  demoConnectorPanelBatch: withParameters(
    defineSnippet(
      'Connector Panel Batch',
      `const target = cad.roundRect(stockWidth, stockHeight, 12).onLayer('stock');
const fastenerInset = 14;

function basePanel() {
  return cad.panel({
    width: panelWidth,
    height: panelHeight,
    radius: 10,
    holes: [
      { kind: 'circle', x: fastenerInset, y: fastenerInset, radius: 3 },
      { kind: 'circle', x: panelWidth - fastenerInset, y: fastenerInset, radius: 3 },
      { kind: 'circle', x: fastenerInset, y: panelHeight - fastenerInset, radius: 3 },
      { kind: 'circle', x: panelWidth - fastenerInset, y: panelHeight - fastenerInset, radius: 3 }
    ]
  });
}

function usbPanel() {
  return basePanel()
    .cut(cad.slot(portSpacing, 10).centerAt([panelWidth / 2, panelHeight / 2 - 12]))
    .cut(cad.slot(portSpacing, 10).centerAt([panelWidth / 2, panelHeight / 2 + 12]))
    .cut(cad.circle(4).centerAt([panelWidth - 18, panelHeight / 2]))
    .onLayer('cut');
}

function networkPanel() {
  return basePanel()
    .cut(cad.roundRect(portSpacing, 18, 6).centerAt([panelWidth / 2, panelHeight / 2]))
    .cut(cad.circle(3).centerAt([panelWidth / 2, panelHeight / 2 - 22]))
    .onLayer('cut');
}

function fanPanel() {
  const fanRadius = Math.max(12, Math.round(panelHeight * 0.18));
  const boltOffsetX = Math.max(16, Math.round(portSpacing * 0.48));
  const boltOffsetY = Math.max(16, Math.round(panelHeight * 0.22));

  return basePanel()
    .cut(cad.circle(fanRadius).centerAt([panelWidth / 2, panelHeight / 2]))
    .cut(cad.circle(3).centerAt([panelWidth / 2 - boltOffsetX, panelHeight / 2 - boltOffsetY]))
    .cut(cad.circle(3).centerAt([panelWidth / 2 + boltOffsetX, panelHeight / 2 - boltOffsetY]))
    .cut(cad.circle(3).centerAt([panelWidth / 2 - boltOffsetX, panelHeight / 2 + boltOffsetY]))
    .cut(cad.circle(3).centerAt([panelWidth / 2 + boltOffsetX, panelHeight / 2 + boltOffsetY]))
    .onLayer('cut');
}

function comboPanel() {
  return basePanel()
    .cut(cad.roundRect(portSpacing - 6, 16, 5).centerAt([panelWidth / 2, panelHeight / 2 - 14]))
    .cut(cad.slot(portSpacing - 8, 8).centerAt([panelWidth / 2, panelHeight / 2 + 14]))
    .onLayer('cut');
}

const panelBuilders = [usbPanel, networkPanel, fanPanel, comboPanel];
const panels = Array.from({ length: batchCount }, (_, index) =>
  panelBuilders[index % panelBuilders.length]()
);
const cableComb = cad
  .roundRect(panelWidth - 14, 16, 5)
  .cut(cad.slot(portSpacing, 4).centerAt([(panelWidth - 14) / 2, 8]))
  .onLayer('cut');

return cad.flatLayout(
  {
    target,
    panel: panels,
    cableComb: [cableComb, cableComb]
  },
  { columns: 3, gapX: 20, gapY: 18 }
);`
    ),
    [
      { name: 'stockWidth', value: 260, min: 180, max: 340, step: 1 },
      { name: 'stockHeight', value: 170, min: 120, max: 240, step: 1 },
      { name: 'panelWidth', value: 90, min: 64, max: 130, step: 1 },
      { name: 'panelHeight', value: 124, min: 84, max: 180, step: 1 },
      { name: 'portSpacing', value: 34, min: 20, max: 60, step: 1 },
      { name: 'batchCount', value: 6, min: 4, max: 10, step: 1 },
    ]
  ),
  demoHookRackSet: withParameters(
    defineSnippet(
      'Hook Rack Set',
      `const target = cad.roundRect(stockWidth, stockHeight, 14).onLayer('stock');
const hookWidth = tabWidth + hookDepth + 26;
const hookHeight = hookDepth + 28;
const mouthWidth = Math.min(hookMouth + 10, hookWidth - 18);

function jHook() {
  return cad
    .roundRect(hookWidth, hookHeight, 12)
    .cut(cad.circle(Math.max(16, Math.round(hookDepth * 0.42))).centerAt([tabWidth + hookDepth * 0.45, hookHeight * 0.58]))
    .cut(cad.rect(mouthWidth, hookDepth).centerAt([hookWidth - mouthWidth / 2 + 6, hookHeight * 0.58]))
    .cut(cad.circle(4).centerAt([tabWidth / 2, 18]))
    .cut(cad.circle(4).centerAt([tabWidth / 2, hookHeight - 18]))
    .onLayer('cut');
}

function crescentHook() {
  const bodyLength = hookDepth + 34;
  const bodyHeight = Math.max(28, Math.round(hookDepth * 0.72));

  return cad
    .capsule(bodyLength, bodyHeight)
    .cut(cad.circle(Math.max(12, Math.round(hookDepth * 0.34))).centerAt([bodyLength * 0.42, bodyHeight / 2]))
    .cut(cad.rect(hookMouth + 8, bodyHeight - 6).centerAt([bodyLength - 6, bodyHeight / 2]))
    .onLayer('cut');
}

function hanger() {
  const hangerWidth = tabWidth + hookDepth + 18;

  return cad
    .roundRect(hangerWidth, 42, 10)
    .cut(cad.slot(hangerWidth - 26, 10).centerAt([hangerWidth / 2, 12]))
    .cut(cad.circle(7).centerAt([hangerWidth / 2, 30]))
    .onLayer('cut');
}

const hooks = Array.from({ length: hookCount }, () => jHook());
const crescents = Array.from(
  { length: Math.max(2, Math.round(hookCount / 2)) },
  () => crescentHook()
);
const hangers = [hanger(), hanger()];

return cad.flatLayout(
  {
    target,
    hook: hooks,
    crescent: crescents,
    hanger: hangers
  },
  { columns: 3, gapX: 22, gapY: 20 }
);`
    ),
    [
      { name: 'stockWidth', value: 180, min: 130, max: 260, step: 1 },
      { name: 'stockHeight', value: 230, min: 160, max: 320, step: 1 },
      { name: 'hookDepth', value: 62, min: 42, max: 90, step: 1 },
      { name: 'hookMouth', value: 20, min: 12, max: 36, step: 1 },
      { name: 'tabWidth', value: 24, min: 16, max: 40, step: 1 },
      { name: 'hookCount', value: 4, min: 3, max: 7, step: 1 },
    ]
  ),
  demoRailPack: withParameters(
    defineSnippet(
      'Rail Pack',
      `const target = cad.rect(stockWidth, stockHeight).onLayer('stock');

function rail(length) {
  const holeInset = railWidth / 2;
  const slotLength = Math.max(length - 48, 24);

  return cad
    .panel({
      width: railWidth,
      height: length,
      radius: Math.max(4, Math.round(railWidth / 4)),
      holes: [
        { kind: 'circle', x: holeInset, y: holeInset, radius: 3 },
        { kind: 'circle', x: holeInset, y: length - holeInset, radius: 3 }
      ]
    })
    .cut(cad.slot(slotLength, 8).centerAt([railWidth / 2, length / 2]))
    .onLayer('cut');
}

const railA = rail(railLength);
const railB = rail(railLength - railStep);
const railC = rail(railLength - railStep * 2);
const bracketHeight = Math.max(36, Math.round(bracketWidth * 0.62));
const angleBracket = cad
  .panel({
    width: bracketWidth,
    height: bracketHeight,
    radius: 8,
    holes: [
      { kind: 'circle', x: 16, y: bracketHeight / 2, radius: 4 },
      { kind: 'circle', x: bracketWidth - 16, y: bracketHeight / 2, radius: 4 }
    ]
  })
  .onLayer('cut');

return cad.flatLayout(
  {
    target,
    rail: [railA, railB, railC],
    angleBracket
  },
  { columns: 3, gapX: 28, gapY: 24 }
);`
    ),
    [
      { name: 'stockWidth', value: 240, min: 180, max: 320, step: 1 },
      { name: 'stockHeight', value: 110, min: 80, max: 160, step: 1 },
      { name: 'railWidth', value: 26, min: 18, max: 40, step: 1 },
      { name: 'railLength', value: 132, min: 96, max: 180, step: 1 },
      { name: 'railStep', value: 8, min: 4, max: 18, step: 1 },
      { name: 'bracketWidth', value: 68, min: 48, max: 90, step: 1 },
    ]
  ),
  demoTrayInserts: withParameters(
    defineSnippet(
      'Tray Inserts',
      `const target = cad.rect(stockWidth, stockHeight).onLayer('stock');

function trayInsert(width, height, mouthSide) {
  const shell = cad.roundRect(width, height, 10);
  const mouth = cad
    .slot(mouthLength, 18)
    .alignTo(shell, 'center', mouthSide === 'left' ? 'left' : 'right');
  const locatorX = mouthSide === 'left' ? width - 18 : 18;

  return shell
    .cut(mouth)
    .cut(cad.circle(5).centerAt([locatorX, height / 2]))
    .onLayer('cut');
}

const trayLeft = trayInsert(trayWidth, trayHeight, 'right');
const trayRight = trayInsert(trayWidth, trayHeight, 'left');
const fillerWidth = Math.round(trayWidth * 0.36);
const fillerHeight = Math.round(trayHeight * 0.4);
const fillerA = cad.roundRect(fillerWidth, fillerHeight, 5).onLayer('cut');
const fillerB = cad.rect(fillerWidth + 2, fillerHeight + 2).onLayer('cut');
const latch = cad.capsule(latchLength, 18).onLayer('cut');

return cad.flatLayout(
  {
    target,
    tray: [trayLeft, trayRight],
    filler: [fillerA, fillerB],
    latch
  },
  { columns: 3, gapX: 22, gapY: 20 }
);`
    ),
    [
      { name: 'stockWidth', value: 190, min: 150, max: 260, step: 1 },
      { name: 'stockHeight', value: 120, min: 90, max: 180, step: 1 },
      { name: 'trayWidth', value: 88, min: 70, max: 110, step: 1 },
      { name: 'trayHeight', value: 56, min: 44, max: 80, step: 1 },
      { name: 'mouthLength', value: 34, min: 18, max: 50, step: 1 },
      { name: 'latchLength', value: 56, min: 40, max: 80, step: 1 },
    ]
  ),
  demoFrameInsert: withParameters(
    defineSnippet(
      'Frame Insert',
      `const target = cad.rect(stockWidth, stockHeight).onLayer('stock');
const insertWidth = frameWidth - frameBorder * 2 - insertClearance;
const insertHeight = frameHeight - frameBorder * 2 - insertClearance;

const frame = cad
  .frame(frameWidth, frameHeight, frameBorder, { radius: 10 })
  .cut(cad.circle(5).centerAt([18, 18]))
  .cut(cad.circle(5).centerAt([frameWidth - 18, 18]))
  .cut(cad.circle(5).centerAt([18, frameHeight - 18]))
  .cut(cad.circle(5).centerAt([frameWidth - 18, frameHeight - 18]))
  .onLayer('cut');

const insert = cad.roundRect(insertWidth, insertHeight, 8).onLayer('cut');
const latch = cad.capsule(56, 18).onLayer('cut');
const shim = cad.roundRect(frameBorder * 2 + 8, frameBorder, 4).onLayer('cut');
const cap = cad
  .roundRect(34, 34, 8)
  .cut(cad.circle(8).centerAt([17, 17]))
  .onLayer('cut');

return cad.flatLayout(
  {
    target,
    frame,
    insert,
    latch,
    shim,
    cap
  },
  { columns: 3, gapX: 22, gapY: 20 }
);`
    ),
    [
      { name: 'stockWidth', value: 220, min: 180, max: 300, step: 1 },
      { name: 'stockHeight', value: 140, min: 110, max: 200, step: 1 },
      { name: 'frameWidth', value: 118, min: 100, max: 150, step: 1 },
      { name: 'frameHeight', value: 90, min: 84, max: 120, step: 1 },
      { name: 'frameBorder', value: 18, min: 12, max: 24, step: 1 },
      { name: 'insertClearance', value: 6, min: 2, max: 10, step: 1 },
    ]
  ),
  demoPerforatedSheet: withParameters(
    defineSnippet(
      'Perforated Sheet',
      `const target = cad
  .panel({
    width: sheetWidth,
    height: sheetHeight,
    radius: 14,
    holes: [
      { kind: 'circle', x: sheetWidth * 0.18, y: 50, radius: holeRadius },
      { kind: 'circle', x: sheetWidth * 0.5, y: 50, radius: holeRadius },
      { kind: 'circle', x: sheetWidth * 0.82, y: 50, radius: holeRadius },
      { kind: 'slot', x: sheetWidth * 0.25, y: sheetHeight - 50, length: outerSlotLength, width: 14 },
      { kind: 'slot', x: sheetWidth * 0.5, y: sheetHeight - 50, length: centerSlotLength, width: 16 },
      { kind: 'slot', x: sheetWidth * 0.75, y: sheetHeight - 50, length: outerSlotLength, width: 14 }
    ]
  })
  .onLayer('stock');

const coverA = cad
  .panel({
    width: coverWidth,
    height: 52,
    radius: 8,
    holes: [
      { kind: 'circle', x: 18, y: 26, radius: 4 },
      { kind: 'circle', x: coverWidth - 18, y: 26, radius: 4 }
    ]
  })
  .onLayer('cut');

const coverBWidth = Math.max(64, coverWidth - 14);
const coverB = cad
  .panel({
    width: coverBWidth,
    height: 50,
    radius: 8,
    holes: [
      { kind: 'circle', x: 20, y: 25, radius: 4 },
      { kind: 'circle', x: coverBWidth - 20, y: 25, radius: 4 }
    ]
  })
  .onLayer('cut');

const handle = cad
  .capsule(coverWidth - 8, 24)
  .cut(cad.slot(Math.max(28, coverWidth - 56), 8).centerAt([(coverWidth - 8) / 2, 12]))
  .onLayer('cut');

const brace = cad.rect(coverWidth - 22, 20).onLayer('cut');
const anchor = cad
  .roundRect(46, 46, 8)
  .cut(cad.circle(8).centerAt([23, 23]))
  .onLayer('cut');

return cad.flatLayout(
  {
    target,
    cover: [coverA, coverB],
    handle,
    brace,
    anchor
  },
  { columns: 3, gapX: 22, gapY: 20 }
);`
    ),
    [
      { name: 'sheetWidth', value: 280, min: 220, max: 340, step: 1 },
      { name: 'sheetHeight', value: 190, min: 150, max: 260, step: 1 },
      { name: 'holeRadius', value: 18, min: 12, max: 28, step: 1 },
      { name: 'outerSlotLength', value: 46, min: 24, max: 72, step: 1 },
      { name: 'centerSlotLength', value: 62, min: 36, max: 90, step: 1 },
      { name: 'coverWidth', value: 96, min: 72, max: 120, step: 1 },
    ]
  ),
  demoRoundedMix: withParameters(
    defineSnippet(
      'Rounded Mix',
      `const target = cad
  .roundRect(stockWidth, stockHeight, Math.round(Math.min(stockWidth, stockHeight) * 0.12))
  .onLayer('stock');

const handle = cad
  .capsule(handleLength, 32)
  .cut(cad.slot(handleLength - 56, 10).centerAt([handleLength / 2, 16]))
  .onLayer('cut');

const motorPlate = cad
  .roundRect(motorPlateWidth, 62, 12)
  .cut(cad.circle(7).centerAt([20, 20]))
  .cut(cad.circle(7).centerAt([motorPlateWidth - 20, 20]))
  .cut(cad.circle(7).centerAt([20, 42]))
  .cut(cad.circle(7).centerAt([motorPlateWidth - 20, 42]))
  .cut(cad.circle(10).centerAt([motorPlateWidth / 2, 31]))
  .onLayer('cut');

const sensorBracket = cad
  .capsule(sensorBracketLength, 28)
  .cut(cad.circle(5).centerAt([18, 14]))
  .cut(cad.circle(5).centerAt([sensorBracketLength - 18, 14]))
  .onLayer('cut');

const sealPad = cad
  .roundRect(sealPadWidth, 40, 10)
  .cut(cad.slot(Math.max(20, sealPadWidth - 34), 8).centerAt([sealPadWidth / 2, 20]))
  .onLayer('cut');

const spacerRing = cad.ring(28, 16).centerAt([28, 28]).onLayer('cut');
const arcBrace = cad
  .capsule(handleLength - 26, 26)
  .cut(cad.slot(handleLength - 70, 8).centerAt([(handleLength - 26) / 2, 13]))
  .onLayer('cut');

return cad.flatLayout(
  {
    target,
    handle,
    motorPlate,
    sensorBracket,
    sealPad,
    spacerRing,
    arcBrace
  },
  { columns: 3, gapX: 24, gapY: 20 }
);`
    ),
    [
      { name: 'stockWidth', value: 250, min: 200, max: 320, step: 1 },
      { name: 'stockHeight', value: 170, min: 130, max: 240, step: 1 },
      { name: 'handleLength', value: 118, min: 90, max: 150, step: 1 },
      { name: 'motorPlateWidth', value: 78, min: 60, max: 100, step: 1 },
      { name: 'sensorBracketLength', value: 74, min: 54, max: 100, step: 1 },
      { name: 'sealPadWidth', value: 64, min: 44, max: 90, step: 1 },
    ]
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

export const getCadSnippetParameters = (snippetId: CadSnippetId): Parameter[] =>
  (CAD_SNIPPETS[snippetId].parameters ?? []).map((parameter) => ({
    ...parameter,
  }));
