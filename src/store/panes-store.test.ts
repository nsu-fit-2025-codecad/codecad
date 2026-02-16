import { beforeEach, describe, expect, it } from 'vitest';
import { usePanesStore } from '@/store/panes-store';

describe('usePanesStore', () => {
  beforeEach(() => {
    usePanesStore.setState({
      isModelsPaneOpen: true,
      isParametersPaneOpen: true,
    });
  });

  it('opens models pane', () => {
    usePanesStore.getState().closeModelsPane();
    usePanesStore.getState().openModelsPane();

    const state = usePanesStore.getState();
    expect(state.isModelsPaneOpen).toBe(true);
  });

  it('opens parameters pane', () => {
    usePanesStore.getState().closeParametersPane();
    usePanesStore.getState().openParametersPane();

    const state = usePanesStore.getState();
    expect(state.isParametersPaneOpen).toBe(true);
  });

  it('toggles models pane open and closed', () => {
    usePanesStore.getState().toggleModelsPane();
    expect(usePanesStore.getState().isModelsPaneOpen).toBe(false);

    usePanesStore.getState().toggleModelsPane();
    expect(usePanesStore.getState().isModelsPaneOpen).toBe(true);
  });

  it('toggles parameters pane open and closed', () => {
    usePanesStore.getState().toggleParametersPane();
    expect(usePanesStore.getState().isParametersPaneOpen).toBe(false);

    usePanesStore.getState().toggleParametersPane();
    expect(usePanesStore.getState().isParametersPaneOpen).toBe(true);
  });
});
