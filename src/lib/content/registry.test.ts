import { describe, expect, it } from 'vitest';
import {
  CAD_CONTENT_PLUGINS,
  getCadEditorSnippetCompletions,
  getCadExampleGroups,
  validateContentRegistry,
} from '@/lib/content/registry';
import { DEFAULT_EDITOR_SNIPPET_ID, getCadSnippet } from '@/lib/cad/snippets';

describe('content registry', () => {
  it('validates plugin and snippet ids', () => {
    expect(() => validateContentRegistry()).not.toThrow();
  });

  it('resolves the default snippet through registered content', () => {
    const allSnippetIds = CAD_CONTENT_PLUGINS.flatMap(
      (plugin) => plugin.snippetIds
    );

    expect(getCadSnippet(DEFAULT_EDITOR_SNIPPET_ID).code).toContain('return');
    expect(allSnippetIds).toContain(DEFAULT_EDITOR_SNIPPET_ID);
  });

  it('generates Monaco snippet completions from snippet metadata', () => {
    const completions = getCadEditorSnippetCompletions();

    expect(
      completions.some((completion) => completion.snippetId === 'quickStart')
    ).toBe(true);
    expect(
      completions.every((completion) => completion.insertText.length > 0)
    ).toBe(true);
  });

  it('groups searchable examples by plugin', () => {
    const groups = getCadExampleGroups('rail');

    expect(groups.map((group) => group.plugin.id)).toContain('nesting-demos');
    expect(
      groups.flatMap((group) => group.examples).map((example) => example.id)
    ).toContain('railPack');
  });
});
