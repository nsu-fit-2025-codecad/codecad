import { describe, expect, it, vi } from 'vitest';
import type { ProjectStateSnapshot } from '@/lib/project-state/contract';
import { createProjectHistory } from '@/lib/project-history';
import { createProjectHistoryCaptureScheduler } from '@/lib/project-history/capture-scheduler';
import {
  getProjectHistoryHotkeyAction,
  isProjectHistoryEditableTargetInfo,
} from '@/lib/project-history/hotkeys';

const createSnapshot = (code: string): ProjectStateSnapshot => ({
  version: 1,
  code,
  parameters: [{ name: 'width', value: code.length }],
  editorSettings: { autorun: true },
  selectedTargetModelId: null,
});

describe('project history', () => {
  it('pushes snapshots and skips no-op duplicates', () => {
    const history = createProjectHistory();

    expect(history.push(createSnapshot('a'))).toBe(true);
    expect(history.push(createSnapshot('a'))).toBe(false);

    expect(history.size()).toBe(1);
    expect(history.canUndo()).toBe(false);
  });

  it('undoes to the previous snapshot', () => {
    const history = createProjectHistory();

    history.push(createSnapshot('a'));
    history.push(createSnapshot('b'));

    expect(history.undo()).toEqual(createSnapshot('a'));
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  it('redoes to the next snapshot', () => {
    const history = createProjectHistory();

    history.push(createSnapshot('a'));
    history.push(createSnapshot('b'));
    history.undo();

    expect(history.redo()).toEqual(createSnapshot('b'));
    expect(history.canRedo()).toBe(false);
  });

  it('clears redo after a new edit', () => {
    const history = createProjectHistory();

    history.push(createSnapshot('a'));
    history.push(createSnapshot('b'));
    history.undo();
    history.push(createSnapshot('c'));

    expect(history.canRedo()).toBe(false);
    expect(history.redo()).toBeNull();
    expect(history.current()).toEqual(createSnapshot('c'));
  });

  it('keeps the max history length', () => {
    const history = createProjectHistory({ limit: 3 });

    history.push(createSnapshot('a'));
    history.push(createSnapshot('b'));
    history.push(createSnapshot('c'));
    history.push(createSnapshot('d'));

    expect(history.size()).toBe(3);
    expect(history.undo()).toEqual(createSnapshot('c'));
    expect(history.undo()).toEqual(createSnapshot('b'));
    expect(history.undo()).toBeNull();
  });

  it('does not mutate stored snapshots or inputs when applying snapshots', () => {
    const history = createProjectHistory();
    const input = createSnapshot('a');

    history.push(input);
    input.parameters[0].value = 999;

    const current = history.current();
    expect(current?.parameters[0].value).toBe(1);

    if (!current) {
      throw new Error('Expected a current snapshot');
    }

    current.parameters[0].value = 123;

    expect(history.current()?.parameters[0].value).toBe(1);
  });
});

describe('project history capture scheduler', () => {
  it('debounces captures and can flush a pending edit', () => {
    const capture = vi.fn();
    const clearTimer = vi.fn();
    const scheduler = createProjectHistoryCaptureScheduler({
      delayMs: 600,
      capture,
      setTimer: () => {
        return 1;
      },
      clearTimer,
    });

    scheduler.schedule();
    scheduler.schedule();

    expect(clearTimer).toHaveBeenCalledWith(1);
    expect(scheduler.hasPending()).toBe(true);
    expect(scheduler.flush()).toBe(true);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(scheduler.hasPending()).toBe(false);
  });

  it('captures once when the pending timer fires', () => {
    const capture = vi.fn();
    let wasCallbackScheduled = false;
    let pendingCallback: () => void = () => {
      throw new Error('Expected a pending callback');
    };
    const scheduler = createProjectHistoryCaptureScheduler({
      delayMs: 600,
      capture,
      setTimer: (callback) => {
        wasCallbackScheduled = true;
        pendingCallback = callback;
        return 1;
      },
      clearTimer: vi.fn(),
    });

    scheduler.schedule();
    expect(wasCallbackScheduled).toBe(true);
    pendingCallback();

    expect(capture).toHaveBeenCalledTimes(1);
    expect(scheduler.hasPending()).toBe(false);
  });
});

describe('project history hotkeys', () => {
  it('keeps Monaco and editable targets on their native undo stack', () => {
    const editableTargets = [
      {
        closest: (selector: string) =>
          selector === '.monaco-editor' ? {} : null,
      },
      {
        closest: (selector: string) =>
          selector === 'input, textarea, select' ? {} : null,
      },
      {
        closest: (selector: string) =>
          selector === 'input, textarea, select' ? {} : null,
      },
      {
        closest: (selector: string) =>
          selector === 'input, textarea, select' ? {} : null,
      },
      {
        closest: () => null,
        getAttribute: (name: string) =>
          name === 'contenteditable' ? 'true' : null,
      },
    ];

    editableTargets.forEach((target) => {
      expect(isProjectHistoryEditableTargetInfo(target)).toBe(true);
    });
  });

  it('handles project undo and redo from non-editable targets', () => {
    expect(
      getProjectHistoryHotkeyAction({
        key: 'z',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        target: null,
      })
    ).toBe('undo');
    expect(
      getProjectHistoryHotkeyAction({
        key: 'Z',
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
        target: null,
      })
    ).toBe('redo');
    expect(
      getProjectHistoryHotkeyAction({
        key: 'y',
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        target: null,
      })
    ).toBe('redo');
  });
});
