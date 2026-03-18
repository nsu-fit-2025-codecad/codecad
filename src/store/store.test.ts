import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useParametersStore } from '@/store/store';

describe('useParametersStore', () => {
  const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

  beforeEach(() => {
    useParametersStore.setState({ parameters: [] });
  });

  afterEach(() => {
    consoleWarnSpy.mockClear();
  });

  it('replaces the entire parameter set for scene loads', () => {
    useParametersStore.getState().replaceAll([
      { name: 'plateWidth', value: 180, min: 120, max: 260, step: 1 },
      { name: 'plateHeight', value: 110, min: 80, max: 180, step: 1 },
    ]);

    expect(useParametersStore.getState().parameters).toEqual([
      { name: 'plateWidth', value: 180, min: 120, max: 260, step: 1 },
      { name: 'plateHeight', value: 110, min: 80, max: 180, step: 1 },
    ]);

    useParametersStore
      .getState()
      .replaceAll([
        { name: 'stockWidth', value: 240, min: 180, max: 320, step: 1 },
      ]);

    expect(useParametersStore.getState().parameters).toEqual([
      { name: 'stockWidth', value: 240, min: 180, max: 320, step: 1 },
    ]);
  });

  it('clones incoming scene parameters before storing them', () => {
    const sceneParameters = [
      { name: 'trayWidth', value: 88, min: 70, max: 110, step: 1 },
    ];

    useParametersStore.getState().replaceAll(sceneParameters);
    sceneParameters[0].value = 999;

    expect(useParametersStore.getState().parameters).toEqual([
      { name: 'trayWidth', value: 88, min: 70, max: 110, step: 1 },
    ]);
  });
});
