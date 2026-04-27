export type ProjectHistoryHotkeyAction = 'undo' | 'redo';

interface ProjectHistoryHotkeyEvent {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

interface ProjectHistoryTargetLike {
  closest: (selector: string) => unknown;
  parentElement?: ProjectHistoryTargetLike | null;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
}

export const isProjectHistoryEditableTargetInfo = (
  element: ProjectHistoryTargetLike
) => {
  if (element.closest('.monaco-editor')) {
    return true;
  }

  if (element.closest('input, textarea, select')) {
    return true;
  }

  let currentElement: ProjectHistoryTargetLike | null = element;

  while (currentElement) {
    const contentEditableAttribute =
      currentElement.getAttribute?.('contenteditable');

    if (
      currentElement.isContentEditable ||
      contentEditableAttribute === '' ||
      contentEditableAttribute === 'true'
    ) {
      return true;
    }

    currentElement = currentElement.parentElement ?? null;
  }

  return false;
};

export const isProjectHistoryHotkeyTarget = (target: EventTarget | null) => {
  if (typeof target !== 'object' || target === null || !('closest' in target)) {
    return true;
  }

  return !isProjectHistoryEditableTargetInfo(
    target as unknown as ProjectHistoryTargetLike
  );
};

export const getProjectHistoryHotkeyAction = (
  event: ProjectHistoryHotkeyEvent
): ProjectHistoryHotkeyAction | null => {
  if (
    !event.ctrlKey ||
    event.altKey ||
    !isProjectHistoryHotkeyTarget(event.target)
  ) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === 'z') {
    return event.shiftKey ? 'redo' : 'undo';
  }

  if (key === 'y' && !event.shiftKey) {
    return 'redo';
  }

  return null;
};
