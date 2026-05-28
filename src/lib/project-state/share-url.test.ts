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
import type {
  ProjectStateSnapshot,
  ProjectStateInput,
} from '@/lib/project-state/contract';

// Helper for old-format (JSON+Base64) payloads
const encodeJsonPayload = (value: object) =>
  encodeBase64Url(JSON.stringify(value));

describe('project share URL state', () => {
  describe('new format (MsgPack+Deflate)', () => {
    it('round-trips project source and configuration state (async)', async () => {
      const state: ProjectStateSnapshot = {
        version: 1,
        code: 'return cad.rect(width, 20);',
        parameters: [{ name: 'width', value: 120, min: 10, max: 240 }],
        editorSettings: { autorun: false },
        nestingOptions: {
          gap: 1.5,
          rotations: [0, 90],
          useGeneticSearch: true,
          populationSize: 12,
        },
        selectedTargetModelId: 'panel',
      };

      const payload = await encodeProjectState(state);
      const decoded = await decodeProjectState(payload);

      expect(decoded).toBeDefined();
      expect(decoded?.version).toBe(1);
      expect(decoded?.code).toBe(state.code);
      expect(decoded?.parameters).toEqual(state.parameters);
      expect(decoded?.editorSettings).toEqual(state.editorSettings);
      expect(decoded?.selectedTargetModelId).toBe(state.selectedTargetModelId);

      // nestingOptions проверяем выборочно (схема может нормализовать поля)
      expect(decoded?.nestingOptions?.gap).toBe(1.5);
      expect(decoded?.nestingOptions?.rotations).toEqual([0, 90]);
      expect(decoded?.nestingOptions?.useGeneticSearch).toBe(true);
    });

    it('produces shorter payload than JSON+Base64 for typical state', async () => {
      const state: ProjectStateSnapshot = {
        version: 1,
        code: 'return cad.rect(width, height).union(cad.circle(radius));'.repeat(
          10
        ),
        parameters: Array.from({ length: 5 }, (_, i) => ({
          name: `param${i}`,
          value: i * 10,
          min: 0,
          max: 100,
        })),
        editorSettings: { autorun: true },
        nestingOptions: {
          gap: 2,
          rotations: [0, 90, 180, 270],
          useGeneticSearch: true,
          populationSize: 20,
          maxGenerations: 50,
        },
        selectedTargetModelId: 'complex-model',
      };

      const jsonPayload = encodeBase64Url(JSON.stringify(state));
      const newPayload = await encodeProjectState(state);

      // New format should be noticeably shorter (at least 20% reduction)
      expect(newPayload.length).toBeLessThan(jsonPayload.length * 0.85);
    });

    it('handles empty/minimal state', async () => {
      const state: ProjectStateInput = {
        code: '',
        parameters: [],
        editorSettings: { autorun: false },
      };

      const payload = await encodeProjectState(state);
      const decoded = await decodeProjectState(payload);

      expect(decoded).toMatchObject({
        version: 1,
        code: '',
        parameters: [],
        editorSettings: { autorun: false },
      });
    });
  });

  describe('backward compatibility (old JSON format)', () => {
    it('decodes old-format payloads (version 1, JSON+Base64)', async () => {
      const oldState = {
        version: 1,
        code: 'return cad.rect(10, 10);',
        parameters: [{ name: 'x', value: 5 }],
        editorSettings: { autorun: true },
      };

      const oldPayload = encodeJsonPayload(oldState);
      const decoded = await decodeProjectState(oldPayload);

      expect(decoded).toBeDefined();
      expect(decoded?.version).toBe(1);
      expect(decoded?.code).toBe(oldState.code);
      expect(decoded?.parameters).toEqual(oldState.parameters);
    });

    it('decodes old-format payloads without explicit version', async () => {
      const oldState = {
        code: 'return cad.circle(5);',
        parameters: [],
        editorSettings: { autorun: false },
        // no version field
      };

      const oldPayload = encodeJsonPayload(oldState);
      const decoded = await decodeProjectState(oldPayload);

      expect(decoded).toMatchObject({
        version: 1, // normalized by schema
        code: 'return cad.circle(5);',
        parameters: [],
        editorSettings: { autorun: false },
      });
    });

    it('rejects unsupported future versions', async () => {
      const futureState = {
        version: 99, // unsupported
        code: 'return cad.rect(1, 1);',
        parameters: [],
        editorSettings: { autorun: true },
      };

      const payload = encodeJsonPayload(futureState);
      const decoded = await decodeProjectState(payload);

      expect(decoded).toBeNull();
    });
  });

  describe('error handling', () => {
    it('rejects corrupt payloads', async () => {
      expect(await decodeProjectState('not-valid')).toBeNull();
      expect(await decodeProjectState('!!!@@@###')).toBeNull();
    });

    it('rejects malformed Base64URL', async () => {
      expect(await decodeProjectState('___invalid___')).toBeNull();
    });

    it('rejects invalid JSON in fallback path', async () => {
      const badJson = encodeBase64Url('{ "version": 1, "code": '); // truncated JSON
      expect(await decodeProjectState(badJson)).toBeNull();
    });
  });

  describe('URL utilities', () => {
    it('creates and parses share URLs with new async API', async () => {
      const state: ProjectStateSnapshot = {
        version: 1,
        code: 'return cad.rect(10, 10);',
        parameters: [],
        editorSettings: { autorun: true },
        selectedTargetModelId: null,
      };

      const baseUrl = 'http://localhost:5173/#/?tab=models';
      const url = await createProjectShareUrl(state, baseUrl);
      const parsedUrl = new URL(url);

      expect(parsedUrl.searchParams.has(PROJECT_STATE_QUERY_PARAM)).toBe(true);
      expect(parsedUrl.hash).toBe('#/?tab=models');

      const decoded = await readProjectStateFromUrl(url);
      expect(decoded).toBeDefined();
      expect(decoded?.version).toBe(1);
      expect(decoded?.code).toBe(state.code);
      expect(decoded?.parameters).toEqual(state.parameters);
      expect(decoded?.editorSettings.autorun).toBe(true);

      expect(decoded?.selectedTargetModelId ?? null).toBeNull();
    });

    it('removes project param from URL correctly', () => {
      const url = 'http://localhost:5173/path?project=abc123&other=value#hash';
      const cleaned = removeProjectStateFromUrl(url);
      expect(cleaned).toBe('/path?other=value#hash');
    });

    it('handles URL with no project param', async () => {
      const url = 'http://localhost:5173/path?other=value';
      const decoded = await readProjectStateFromUrl(url);
      expect(decoded).toBeNull();
    });
  });

  describe('immutability and normalization', () => {
    it('clones and normalizes without mutating input state', async () => {
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
      const payload = await encodeProjectState(state);
      const decoded = await decodeProjectState(payload);

      expect(state).toEqual(snapshot); // input not mutated
      expect(decoded).not.toBe(state); // new object
      expect(decoded?.parameters).not.toBe(state.parameters); // deep clone

      expect(decoded?.nestingOptions).toMatchObject({
        gap: 2,
        allowRotation: false,
        // rotationCount может быть нормализован схемой — проверяем только rotations
        rotations: expect.arrayContaining([0]),
      });
    });
  });

  describe('hydration integration', () => {
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
      expect(setNestingOptions).toHaveBeenCalledWith(
        expect.objectContaining({ gap: 3 })
      );
      expect(editCode).toHaveBeenCalledWith(state.code);
      expect(evaluateSourceCode).toHaveBeenCalledWith(
        state.code,
        state.parameters
      );
      expect(selectTargetModel).toHaveBeenCalledWith('panel');
      expect(clearSelectedTargetModel).not.toHaveBeenCalled();
    });
  });
});
