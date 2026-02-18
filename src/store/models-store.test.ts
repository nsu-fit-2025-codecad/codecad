import { beforeEach, describe, expect, it } from 'vitest';
import { Model, useModelsStore } from '@/store/models-store';

const modelsFixture: Model[] = [
  { id: 'square', width: 100, height: 100 },
  { id: 'circle', width: 50, height: 50 },
];

describe('useModelsStore', () => {
  beforeEach(() => {
    useModelsStore.setState({
      models: [],
      selectedModelId: null,
    });
  });

  it('selects model id from models list', () => {
    useModelsStore.getState().update(modelsFixture);

    useModelsStore.getState().selectModel('square');

    expect(useModelsStore.getState().selectedModelId).toBe('square');
  });

  it('updates selected model id when selection changes', () => {
    useModelsStore.getState().update(modelsFixture);
    useModelsStore.getState().selectModel('square');

    useModelsStore.getState().selectModel('circle');

    expect(useModelsStore.getState().selectedModelId).toBe('circle');
  });

  it('ignores selection for unknown model id', () => {
    useModelsStore.getState().update(modelsFixture);
    useModelsStore.getState().selectModel('square');

    useModelsStore.getState().selectModel('unknown-model-id');

    expect(useModelsStore.getState().selectedModelId).toBe('square');
  });

  it('clears selection explicitly', () => {
    useModelsStore.getState().update(modelsFixture);
    useModelsStore.getState().selectModel('square');

    useModelsStore.getState().clearSelectedModel();

    expect(useModelsStore.getState().selectedModelId).toBeNull();
  });

  it('resets selection when selected model is missing after update', () => {
    useModelsStore.getState().update(modelsFixture);
    useModelsStore.getState().selectModel('square');

    useModelsStore
      .getState()
      .update([{ id: 'triangle', width: 40, height: 40 }]);

    expect(useModelsStore.getState().selectedModelId).toBeNull();
  });
});
