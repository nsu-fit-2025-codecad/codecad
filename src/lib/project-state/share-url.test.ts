import { describe, expect, it, vi } from 'vitest';
import { hydrateProjectState } from '@/lib/project-state/hydrate';
import {
  encodeBase64Url,
  createProjectShareUrl,
  decodeProjectState,
  encodeProjectState,
  PROJECT_STATE_QUERY_PARAM,
  readProjectStateFromUrl,
  removeProjectStateFromUrl,
} from '@/lib/project-state/share-url';
import type { ProjectStateSnapshot } from '@/lib/project-state/contract';

const encodeJsonPayload = (value: object) =>
  encodeBase64Url(JSON.stringify(value));

describe('project share URL state', () => {
  it('round-trips project source and configuration state', () => {
    const state: ProjectStateSnapshot = {
      version: 1,
      code: 'return cad.rect(width, 20);',
      parameters: [{ name: 'width', value: 120, min: 10, max: 240 }],
      editorSettings: { autorun: false },
      nestingOptions: {
        nestingEngine: 'rust-wasm',
        gap: 1.5,
        rotations: [0, 90],
        useGeneticSearch: true,
        populationSize: 12,
      },
      selectedTargetModelId: 'panel',
    };
    const payload = encodeProjectState(state);

    const decoded = decodeProjectState(payload);

    expect(decoded).toMatchObject({
      ...state,
      nestingOptions: expect.objectContaining({
        gap: 1.5,
        nestingEngine: 'rust-wasm',
        allowRotation: true,
        rotations: [0, 90],
        useGeneticSearch: true,
        populationSize: 12,
      }),
    });
  });

  it('rejects corrupt payloads', () => {
    expect(decodeProjectState('not-valid')).toBeNull();
  });

  it('rejects unsupported versions', () => {
    expect(
      decodeProjectState(
        encodeJsonPayload({
          version: 2,
          code: 'return cad.rect(10, 10);',
          parameters: [],
          editorSettings: { autorun: true },
        })
      )
    ).toBeNull();
  });

  it('writes and reads a router/hash-safe URL', () => {
    const state: ProjectStateSnapshot = {
      version: 1,
      code: 'return cad.rect(10, 10);',
      parameters: [],
      editorSettings: { autorun: true },
      selectedTargetModelId: null,
    };
    const url = createProjectShareUrl(
      state,
      'http://localhost:5173/#/?tab=models'
    );
    const parsedUrl = new URL(url);

    expect(parsedUrl.searchParams.has(PROJECT_STATE_QUERY_PARAM)).toBe(true);
    expect(parsedUrl.hash).toBe('#/?tab=models');
    expect(readProjectStateFromUrl(url)).toEqual(state);
    expect(removeProjectStateFromUrl(url)).toBe('/#/?tab=models');
  });

  it('clones and normalizes without mutating input state', () => {
    const state: ProjectStateSnapshot = {
      version: 1,
      code: 'return cad.rect(width, height);',
      parameters: [
        { name: 'width', value: 100, min: 10 },
        { name: 'height', value: 50, step: 5 },
      ],
      editorSettings: { autorun: false },
      nestingOptions: { gap: 2, allowRotation: false, rotationCount: 4 },
      selectedTargetModelId: 'sheet',
    };
    const snapshot = structuredClone(state);
    const decoded = decodeProjectState(encodeProjectState(state));

    expect(state).toEqual(snapshot);
    expect(decoded).not.toBe(state);
    expect(decoded?.parameters).not.toBe(state.parameters);
    expect(decoded?.parameters[0]).not.toBe(state.parameters[0]);
    expect(decoded?.nestingOptions).toMatchObject({
      gap: 2,
      allowRotation: false,
      rotationCount: 1,
      rotations: [0],
    });
  });

  it('hydrates valid state through the project-state helper', () => {
    const state: ProjectStateSnapshot = {
      version: 1,
      code: 'return cad.rect(width, 20);',
      parameters: [{ name: 'width', value: 120 }],
      editorSettings: { autorun: false },
      nestingOptions: { gap: 3 },
      selectedTargetModelId: 'panel',
    };
    const replaceParameters = vi.fn();
    const editCode = vi.fn();
    const editSettings = vi.fn();
    const setNestingOptions = vi.fn();
    const evaluateSourceCode = vi.fn();
    const selectTargetModel = vi.fn();
    const clearSelectedTargetModel = vi.fn();

    hydrateProjectState({
      state,
      replaceParameters,
      editCode,
      editSettings,
      setNestingOptions,
      evaluateSourceCode,
      selectTargetModel,
      clearSelectedTargetModel,
    });

    expect(replaceParameters).toHaveBeenCalledWith(state.parameters);
    expect(editSettings).toHaveBeenCalledWith({ autorun: false });
    expect(setNestingOptions).toHaveBeenCalledWith({ gap: 3 });
    expect(editCode).toHaveBeenCalledWith(state.code);
    expect(evaluateSourceCode).toHaveBeenCalledWith(
      state.code,
      state.parameters
    );
    expect(selectTargetModel).toHaveBeenCalledWith('panel');
    expect(clearSelectedTargetModel).not.toHaveBeenCalled();
  });
});
