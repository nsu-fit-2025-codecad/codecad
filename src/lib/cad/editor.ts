import { getCadSnippetEditorCode, type CadSnippetId } from '@/lib/cad/snippets';

const CAD_EDITOR_EXTRA_LIB_PATH = 'ts:cad-runtime-globals.d.ts';

interface CompletionDefinition {
  label: string;
  detail: string;
  documentation: string;
  insertText: string;
  kind: 'function' | 'method' | 'snippet';
  snippetId?: CadSnippetId;
}

interface DisposableLike {
  dispose(): void;
}

interface EditorPositionLike {
  lineNumber: number;
  column: number;
}

interface EditorWordLike {
  startColumn: number;
  endColumn: number;
}

interface EditorModelLike {
  getWordUntilPosition(position: EditorPositionLike): EditorWordLike;
  getLineContent(lineNumber: number): string;
}

interface CompletionRangeLike {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

interface CompletionItemLike {
  label: string;
  detail: string;
  documentation: {
    value: string;
  };
  insertText: string;
  insertTextRules?: number;
  kind: number;
  range: CompletionRangeLike;
  sortText: string;
}

interface CompletionProviderLike {
  triggerCharacters?: string[];
  provideCompletionItems(
    model: EditorModelLike,
    position: EditorPositionLike
  ): {
    suggestions: CompletionItemLike[];
  };
}

interface MonacoEditorApi {
  languages: {
    CompletionItemKind: {
      Function: number;
      Method: number;
      Snippet: number;
    };
    CompletionItemInsertTextRule: {
      InsertAsSnippet: number;
    };
    typescript: {
      javascriptDefaults: {
        addExtraLib(content: string, filePath?: string): DisposableLike;
      };
    };
    registerCompletionItemProvider(
      languageId: string,
      provider: CompletionProviderLike
    ): DisposableLike;
  };
}

interface CadEditorEnhancementState {
  owner: symbol | null;
  monaco: MonacoEditorApi | null;
  extraLibDisposable: DisposableLike | null;
  completionDisposable: DisposableLike | null;
}

const CAD_EDITOR_ENHANCEMENT_STATE_KEY =
  '__code_cad_monaco_enhancements__' as const;
const CAD_EDITOR_MODULE_TOKEN = Symbol('cad-editor-module');

export const CAD_EDITOR_EXTRA_LIB = `
type Point2D = readonly [number, number];
type Anchor2D =
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
type PanelEdgeKind = 'plain' | 'tabs' | 'notches';

type PanelEdgeOptions =
  | { kind: 'plain' }
  | {
      kind: 'tabs' | 'notches';
      count: number;
      segmentLength: number;
      depth?: number;
      inset?: number;
    };

interface PanelEdgesOptions {
  top?: PanelEdgeOptions;
  right?: PanelEdgeOptions;
  bottom?: PanelEdgeOptions;
  left?: PanelEdgeOptions;
}

interface PanelInsetOptions {
  margin: number;
  radius?: number;
}

type PanelHoleSpec =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | {
      kind: 'slot';
      x: number;
      y: number;
      length: number;
      width: number;
      angleDeg?: number;
    };

interface PanelOptions {
  width: number;
  height: number;
  radius?: number;
  inset?: PanelInsetOptions;
  thickness?: number;
  clearance?: number;
  edges?: PanelEdgesOptions;
  holes?: readonly PanelHoleSpec[];
}

interface FlatLayoutOptions {
  columns: number;
  gapX: number;
  gapY: number;
}

type CadChild = CadEntity | readonly CadEntity[];
type CadChildrenInput = { [id: string]: CadChild } | readonly CadEntity[];

interface CadEntity {
  translate(x: number, y: number): CadEntity;
  rotate(angleDeg: number, origin?: Point2D): CadEntity;
  scale(factor: number, origin?: Point2D): CadEntity;
  mirror(axis: 'x' | 'y'): CadEntity;
  union(other: CadEntity): CadEntity;
  cut(other: CadEntity): CadEntity;
  intersect(other: CadEntity): CadEntity;
  moveTo(point: Point2D, anchor?: Anchor2D): CadEntity;
  centerAt(point: Point2D): CadEntity;
  alignTo(target: CadEntity | Point2D, fromAnchor?: Anchor2D, toAnchor?: Anchor2D): CadEntity;
  array(count: number, stepX: number, stepY?: number): CadEntity;
  grid(columns: number, rows: number, stepX: number, stepY: number): CadEntity;
  polarArray(count: number, angleStepDeg: number, options?: {
    radius?: number;
    origin?: Point2D;
    startAngleDeg?: number;
    rotateItems?: boolean;
  }): CadEntity;
  onLayer(layer: string): CadEntity;
  tag(...tags: string[]): CadEntity;
}

interface CadRuntime {
  rect(width: number, height: number): CadEntity;
  circle(radius: number): CadEntity;
  ring(outerRadius: number, innerRadius: number): CadEntity;
  roundRect(width: number, height: number, radius: number): CadEntity;
  capsule(width: number, height: number): CadEntity;
  slot(length: number, width: number): CadEntity;
  polyline(points: readonly Point2D[], options?: { closed?: boolean }): CadEntity;
  trackPath(points: readonly Point2D[], width: number, options?: { closed?: boolean }): CadEntity;
  frame(width: number, height: number, thickness: number, options?: { radius?: number }): CadEntity;
  panel(options: {
    width: number;
    height: number;
    radius?: number;
    inset?: {
      margin: number;
      radius?: number;
    };
    thickness?: number;
    clearance?: number;
    edges?: {
      top?:
        | { kind: 'plain' }
        | {
            kind: 'tabs' | 'notches';
            count: number;
            segmentLength: number;
            depth?: number;
            inset?: number;
          };
      right?:
        | { kind: 'plain' }
        | {
            kind: 'tabs' | 'notches';
            count: number;
            segmentLength: number;
            depth?: number;
            inset?: number;
          };
      bottom?:
        | { kind: 'plain' }
        | {
            kind: 'tabs' | 'notches';
            count: number;
            segmentLength: number;
            depth?: number;
            inset?: number;
          };
      left?:
        | { kind: 'plain' }
        | {
            kind: 'tabs' | 'notches';
            count: number;
            segmentLength: number;
            depth?: number;
            inset?: number;
          };
    };
    holes?: readonly Array<
      | {
          kind: 'circle';
          x: number;
          y: number;
          radius: number;
        }
      | {
          kind: 'slot';
          x: number;
          y: number;
          length: number;
          width: number;
          angleDeg?: number;
        }
    >;
  }): CadEntity;
  spokeWheel(options: {
    outerRadius: number;
    innerRadius: number;
    spokes: number;
    spokeWidth?: number;
    hubRadius?: number;
    bore?: number;
  }): CadEntity;
  gear(options: {
    teeth: number;
    outerRadius: number;
    rootRadius: number;
    bore?: number;
    toothFraction?: number;
    rootFraction?: number;
    rotationDeg?: number;
  }): CadEntity;
  clockFace(options: {
    radius: number;
    rimWidth?: number;
    tickCount?: number;
    tickLength?: number;
    tickWidth?: number;
    centerHole?: number;
  }): CadEntity;
  fromSvgPathData(pathData: string, options?: { bezierAccuracy?: number }): CadEntity;
  flatLayout(
    parts: CadChildrenInput,
    options: {
      columns: number;
      gapX: number;
      gapY: number;
    }
  ): CadEntity;
  assembly(children: CadChildrenInput): CadEntity;
  sketch(children: CadChildrenInput): CadEntity;
  compileToMaker(value: CadEntity): unknown;
}

declare const cad: CadRuntime;
declare const makerjs: any;
`;

export const CAD_EDITOR_SNIPPETS: CompletionDefinition[] = [
  {
    label: 'cad sketch',
    detail: 'Минимальный sketch',
    documentation: 'Быстрый старт с cad.sketch и одной базовой деталью.',
    insertText: getCadSnippetEditorCode('quickStart'),
    kind: 'snippet',
    snippetId: 'quickStart',
  },
  {
    label: 'cad scene',
    detail: 'Небольшая раскладка',
    documentation:
      'Вставляет компактную раскладку нескольких деталей через cad.flatLayout.',
    insertText: getCadSnippetEditorCode('editorFlatScene'),
    kind: 'snippet',
    snippetId: 'editorFlatScene',
  },
  {
    label: 'cad panel',
    detail: 'Пример панели',
    documentation: 'Вставляет панель с кромками типа tabs/notches.',
    insertText: getCadSnippetEditorCode('helperPanel'),
    kind: 'snippet',
    snippetId: 'helperPanel',
  },
  {
    label: 'cad flat layout',
    detail: 'Раскладка деталей',
    documentation:
      'Вставляет набор согласованных панелей и раскладывает их на листе.',
    insertText: getCadSnippetEditorCode('helperFlatLayout'),
    kind: 'snippet',
    snippetId: 'helperFlatLayout',
  },
  {
    label: 'cad demo mounting plate',
    detail: 'MVP scene: single part',
    documentation:
      'Inserts a compact fabrication plate with holes, a slot, and a cutout.',
    insertText: getCadSnippetEditorCode('demoMountingPlate'),
    kind: 'snippet',
    snippetId: 'demoMountingPlate',
  },
  {
    label: 'cad demo bottle carrier kit',
    detail: 'MVP scene: slotted carrier',
    documentation:
      'Inserts a bottle carrier nesting scene with concave sides, dividers, and a handle.',
    insertText: getCadSnippetEditorCode('demoBottleCarrierKit'),
    kind: 'snippet',
    snippetId: 'demoBottleCarrierKit',
  },
  {
    label: 'cad demo fan guard pack',
    detail: 'MVP scene: curved ring pack',
    documentation:
      'Inserts a curved nesting scene with fan guards, clips, and caps that can fit inside ring holes.',
    insertText: getCadSnippetEditorCode('demoFanGuardPack'),
    kind: 'snippet',
    snippetId: 'demoFanGuardPack',
  },
  {
    label: 'cad demo connector panel batch',
    detail: 'MVP scene: production batch',
    documentation:
      'Inserts a production-style batch of connector faceplates with varied cutouts.',
    insertText: getCadSnippetEditorCode('demoConnectorPanelBatch'),
    kind: 'snippet',
    snippetId: 'demoConnectorPanelBatch',
  },
  {
    label: 'cad demo hook rack set',
    detail: 'MVP scene: hooked parts',
    documentation:
      'Inserts a hook-and-hanger nesting scene where rotation has a visible impact.',
    insertText: getCadSnippetEditorCode('demoHookRackSet'),
    kind: 'snippet',
    snippetId: 'demoHookRackSet',
  },
  {
    label: 'cad demo rail pack',
    detail: 'MVP scene: rotation matters',
    documentation:
      'Inserts a narrow-stock nesting scene with long rails that benefit from rotation.',
    insertText: getCadSnippetEditorCode('demoRailPack'),
    kind: 'snippet',
    snippetId: 'demoRailPack',
  },
  {
    label: 'cad demo tray inserts',
    detail: 'MVP scene: concave parts',
    documentation:
      'Inserts a nesting scene with concave tray inserts and filler parts.',
    insertText: getCadSnippetEditorCode('demoTrayInserts'),
    kind: 'snippet',
    snippetId: 'demoTrayInserts',
  },
  {
    label: 'cad demo frame insert',
    detail: 'MVP scene: part in hole',
    documentation:
      'Inserts a nesting scene where one part can fit inside another part opening.',
    insertText: getCadSnippetEditorCode('demoFrameInsert'),
    kind: 'snippet',
    snippetId: 'demoFrameInsert',
  },
  {
    label: 'cad demo perforated sheet',
    detail: 'MVP scene: target holes',
    documentation:
      'Inserts a perforated stock sheet where target holes must stay forbidden.',
    insertText: getCadSnippetEditorCode('demoPerforatedSheet'),
    kind: 'snippet',
    snippetId: 'demoPerforatedSheet',
  },
  {
    label: 'cad demo rounded mix',
    detail: 'MVP scene: curved parts',
    documentation:
      'Inserts a curved mixed-parts nesting scene in a rounded target.',
    insertText: getCadSnippetEditorCode('demoRoundedMix'),
    kind: 'snippet',
    snippetId: 'demoRoundedMix',
  },
  {
    label: 'cad gear',
    detail: 'Пример шестерни',
    documentation: 'Вставляет декоративную шестерню и ставит её по центру.',
    insertText: getCadSnippetEditorCode('helperGear'),
    kind: 'snippet',
    snippetId: 'helperGear',
  },
  {
    label: 'cad clock',
    detail: 'Пример циферблата',
    documentation:
      'Вставляет циферблат с ободом, делениями и центральным отверстием.',
    insertText: getCadSnippetEditorCode('helperClockFace'),
    kind: 'snippet',
    snippetId: 'helperClockFace',
  },
  {
    label: 'cad track',
    detail: 'Пример дорожки',
    documentation: 'Вставляет простую дорожку для лабиринтов и треков.',
    insertText: getCadSnippetEditorCode('primitiveTrackPath'),
    kind: 'snippet',
    snippetId: 'primitiveTrackPath',
  },
];

const getCadEditorEnhancementState = (): CadEditorEnhancementState => {
  const globalState = globalThis as typeof globalThis & {
    [CAD_EDITOR_ENHANCEMENT_STATE_KEY]?: CadEditorEnhancementState;
  };

  if (!globalState[CAD_EDITOR_ENHANCEMENT_STATE_KEY]) {
    globalState[CAD_EDITOR_ENHANCEMENT_STATE_KEY] = {
      owner: null,
      monaco: null,
      extraLibDisposable: null,
      completionDisposable: null,
    };
  }

  return globalState[CAD_EDITOR_ENHANCEMENT_STATE_KEY];
};

const toCompletionKind = (
  monaco: MonacoEditorApi,
  kind: CompletionDefinition['kind']
): number => {
  switch (kind) {
    case 'function':
      return monaco.languages.CompletionItemKind.Function;
    case 'method':
      return monaco.languages.CompletionItemKind.Method;
    case 'snippet':
      return monaco.languages.CompletionItemKind.Snippet;
  }
};

const createCompletionItems = (
  monaco: MonacoEditorApi,
  range: CompletionRangeLike,
  definitions: readonly CompletionDefinition[]
): CompletionItemLike[] =>
  definitions.map((definition, index) => ({
    label: definition.label,
    detail: definition.detail,
    documentation: {
      value: definition.documentation,
    },
    insertText: definition.insertText,
    insertTextRules:
      definition.kind === 'snippet'
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
    kind: toCompletionKind(monaco, definition.kind),
    range,
    sortText: `${index}`.padStart(3, '0'),
  }));

const linePrefixEndsWithDot = (linePrefix: string): boolean =>
  /\.\s*$/.test(linePrefix);

const linePrefixTargetsCadFactories = (linePrefix: string): boolean =>
  /cad\.[\w$]*$/.test(linePrefix);

const linePrefixTargetsCadSnippets = (linePrefix: string): boolean => {
  const trimmedPrefix = linePrefix.trimStart();

  return trimmedPrefix.length === 0 || /\bcad[\w-]*$/i.test(trimmedPrefix);
};

const disposeCadEditorEnhancements = (): void => {
  const state = getCadEditorEnhancementState();

  state.completionDisposable?.dispose();
  state.extraLibDisposable?.dispose();
  state.completionDisposable = null;
  state.extraLibDisposable = null;
  state.monaco = null;
};

export const configureCadEditor = (monaco: MonacoEditorApi): void => {
  const state = getCadEditorEnhancementState();

  if (
    state.owner !== CAD_EDITOR_MODULE_TOKEN ||
    (state.monaco !== null && state.monaco !== monaco)
  ) {
    disposeCadEditorEnhancements();
    state.owner = CAD_EDITOR_MODULE_TOKEN;
  }

  if (
    state.monaco === monaco &&
    state.extraLibDisposable &&
    state.completionDisposable
  ) {
    return;
  }

  state.extraLibDisposable =
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      CAD_EDITOR_EXTRA_LIB,
      CAD_EDITOR_EXTRA_LIB_PATH
    );

  state.completionDisposable = monaco.languages.registerCompletionItemProvider(
    'javascript',
    {
      triggerCharacters: ['.'],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        const linePrefix = model
          .getLineContent(position.lineNumber)
          .slice(0, position.column - 1);

        if (
          linePrefixTargetsCadFactories(linePrefix) ||
          linePrefixEndsWithDot(linePrefix) ||
          !linePrefixTargetsCadSnippets(linePrefix)
        ) {
          return { suggestions: [] };
        }

        return {
          suggestions: createCompletionItems(
            monaco,
            range,
            CAD_EDITOR_SNIPPETS
          ),
        };
      },
    }
  );
  state.monaco = monaco;
};

export const resetCadEditorEnhancementsForTest = (): void => {
  const state = getCadEditorEnhancementState();
  const globalState = globalThis as typeof globalThis & {
    [CAD_EDITOR_ENHANCEMENT_STATE_KEY]?: CadEditorEnhancementState;
  };

  disposeCadEditorEnhancements();
  state.owner = null;
  delete globalState[CAD_EDITOR_ENHANCEMENT_STATE_KEY];
};
