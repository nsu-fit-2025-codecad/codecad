import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAD_EDITOR_EXTRA_LIB,
  CAD_EDITOR_SNIPPETS,
  configureCadEditor,
  resetCadEditorEnhancementsForTest,
} from '@/lib/cad/editor';
import {
  CAD_SNIPPETS,
  getCadSnippetEditorCode,
  type CadSnippetId,
} from '@/lib/cad/snippets';

const createMonacoStub = () => {
  const addExtraLib = vi.fn(() => ({
    dispose: vi.fn(),
  }));
  const registerCompletionItemProvider = vi.fn(
    (_languageId: string, provider: unknown) => ({
      dispose: vi.fn(),
      provider,
    })
  );

  return {
    languages: {
      CompletionItemKind: {
        Function: 1,
        Method: 2,
        Snippet: 3,
      },
      CompletionItemInsertTextRule: {
        InsertAsSnippet: 4,
      },
      typescript: {
        javascriptDefaults: {
          addExtraLib,
        },
      },
      registerCompletionItemProvider,
    },
  };
};

const createModelStub = (lineContent: string) => ({
  getWordUntilPosition: () => ({
    startColumn: lineContent.length + 1,
    endColumn: lineContent.length + 1,
  }),
  getLineContent: () => lineContent,
});

describe('configureCadEditor', () => {
  beforeEach(() => {
    resetCadEditorEnhancementsForTest();
  });

  it('registers ambient cad globals for javascript editor sessions', () => {
    const monaco = createMonacoStub();

    configureCadEditor(monaco as never);

    expect(
      monaco.languages.typescript.javascriptDefaults.addExtraLib
    ).toHaveBeenCalledWith(
      expect.stringContaining('declare const cad: CadRuntime;'),
      expect.any(String)
    );
    expect(CAD_EDITOR_EXTRA_LIB).toContain('declare const makerjs: any;');
    expect(CAD_EDITOR_EXTRA_LIB).toContain(
      "type PanelEdgeKind = 'plain' | 'tabs' | 'notches';"
    );
    expect(CAD_EDITOR_EXTRA_LIB).toContain('type PanelEdgeOptions =');
    expect(CAD_EDITOR_EXTRA_LIB).toContain('interface PanelOptions {');
    expect(CAD_EDITOR_EXTRA_LIB).toContain('interface FlatLayoutOptions {');
    expect(CAD_EDITOR_EXTRA_LIB).toContain('type CadChildrenInput =');
    expect(CAD_EDITOR_EXTRA_LIB).toContain('panel(options: {');
    expect(CAD_EDITOR_EXTRA_LIB).toContain("{ kind: 'plain' }");
    expect(CAD_EDITOR_EXTRA_LIB).toContain("kind: 'tabs' | 'notches';");
    expect(CAD_EDITOR_EXTRA_LIB).toContain('flatLayout(');
    expect(CAD_EDITOR_EXTRA_LIB).toContain('parts: CadChildrenInput,');
  });

  it('registers custom snippet completions without duplicating dot-based JS suggestions', () => {
    const monaco = createMonacoStub();

    configureCadEditor(monaco as never);

    const provider = monaco.languages.registerCompletionItemProvider.mock
      .calls[0][1] as {
      provideCompletionItems: (
        model: ReturnType<typeof createModelStub>,
        position: { lineNumber: number; column: number }
      ) => {
        suggestions: Array<{ label: string }>;
      };
    };
    const snippetItems = provider.provideCompletionItems(createModelStub(''), {
      lineNumber: 1,
      column: 1,
    }).suggestions;

    expect(
      provider.provideCompletionItems(createModelStub('cad.'), {
        lineNumber: 1,
        column: 5,
      }).suggestions
    ).toEqual([]);
    expect(
      provider.provideCompletionItems(createModelStub('gear.'), {
        lineNumber: 1,
        column: 6,
      }).suggestions
    ).toEqual([]);
    expect(snippetItems.map((item: { label: string }) => item.label)).toEqual(
      expect.arrayContaining(
        CAD_EDITOR_SNIPPETS.map((snippet) => snippet.label)
      )
    );
    expect(
      provider.provideCompletionItems(createModelStub('const foo = bar'), {
        lineNumber: 1,
        column: 16,
      }).suggestions
    ).toEqual([]);
  });

  it('configures Monaco only once per session', () => {
    const monaco = createMonacoStub();

    configureCadEditor(monaco as never);
    configureCadEditor(monaco as never);

    expect(
      monaco.languages.typescript.javascriptDefaults.addExtraLib
    ).toHaveBeenCalledTimes(1);
    expect(
      monaco.languages.registerCompletionItemProvider
    ).toHaveBeenCalledTimes(1);
  });

  it('replaces stale editor registrations after a module reload', async () => {
    const monaco = createMonacoStub();

    vi.resetModules();
    const firstModule = await import('@/lib/cad/editor');
    firstModule.configureCadEditor(monaco as never);

    const firstExtraLibRegistration =
      monaco.languages.typescript.javascriptDefaults.addExtraLib.mock.results[0]
        .value;
    const firstCompletionRegistration =
      monaco.languages.registerCompletionItemProvider.mock.results[0].value;

    vi.resetModules();
    const secondModule = await import('@/lib/cad/editor');
    secondModule.configureCadEditor(monaco as never);

    expect(firstExtraLibRegistration.dispose).toHaveBeenCalledTimes(1);
    expect(firstCompletionRegistration.dispose).toHaveBeenCalledTimes(1);
    expect(
      monaco.languages.typescript.javascriptDefaults.addExtraLib
    ).toHaveBeenCalledTimes(2);
    expect(
      monaco.languages.registerCompletionItemProvider
    ).toHaveBeenCalledTimes(2);

    secondModule.resetCadEditorEnhancementsForTest();
  });

  it('uses shared snippet registry entries for editor snippets', () => {
    CAD_EDITOR_SNIPPETS.forEach((snippetDefinition) => {
      expect(snippetDefinition.snippetId).toBeDefined();
      expect(snippetDefinition.insertText).toBe(
        getCadSnippetEditorCode(snippetDefinition.snippetId!)
      );
    });
  });

  it('keeps helper completion snippets paste-safe for existing editor buffers', () => {
    const inlineHelperSnippetIds: CadSnippetId[] = [
      'helperPanel',
      'helperGear',
      'helperClockFace',
      'primitiveTrackPath',
    ];

    inlineHelperSnippetIds.forEach((snippetId) => {
      expect(getCadSnippetEditorCode(snippetId)).not.toContain(
        'return cad.sketch'
      );
      expect(getCadSnippetEditorCode(snippetId)).not.toBe(
        CAD_SNIPPETS[snippetId].code
      );
    });
  });
});
