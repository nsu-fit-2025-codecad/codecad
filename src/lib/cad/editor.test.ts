import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CAD_EDITOR_EXTRA_LIB,
  CAD_EDITOR_SNIPPETS,
  configureCadEditor,
  resetCadEditorEnhancementsForTest,
} from '@/lib/cad/editor';

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
  });

  it('registers cad factory, method, and snippet completions', () => {
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
    const factoryItems = provider.provideCompletionItems(
      createModelStub('cad.'),
      { lineNumber: 1, column: 5 }
    ).suggestions;
    const methodItems = provider.provideCompletionItems(
      createModelStub('gear.'),
      { lineNumber: 1, column: 6 }
    ).suggestions;
    const snippetItems = provider.provideCompletionItems(createModelStub(''), {
      lineNumber: 1,
      column: 1,
    }).suggestions;

    expect(factoryItems.map((item: { label: string }) => item.label)).toEqual(
      expect.arrayContaining([
        'rect',
        'panel',
        'gear',
        'clockFace',
        'trackPath',
      ])
    );
    expect(methodItems.map((item: { label: string }) => item.label)).toEqual(
      expect.arrayContaining(['centerAt', 'moveTo', 'alignTo', 'cut'])
    );
    expect(snippetItems.map((item: { label: string }) => item.label)).toEqual(
      expect.arrayContaining(
        CAD_EDITOR_SNIPPETS.map((snippet) => snippet.label)
      )
    );
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
});
