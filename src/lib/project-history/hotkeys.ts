export type ProjectHistoryHotkeyAction = 'undo' | 'redo';

interface ProjectHistoryHotkeyEvent {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

interface ProjectHistoryEditableTargetInfo {
  closest: (selector: string) => object | null;
  parentElement?: ProjectHistoryEditableTargetInfo | null;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
}

export const isProjectHistoryEditableTargetInfo = (
  element: ProjectHistoryEditableTargetInfo
) => {
  if (element.closest('.monaco-editor')) {
    return true;
  }

  if (element.closest('input, textarea, select')) {
    return true;
  }

  let currentElement: ProjectHistoryEditableTargetInfo | null = element;

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

const isElementTarget = (target: EventTarget | null): target is Element =>
  typeof Element !== 'undefined' && target instanceof Element;

export const isProjectHistoryHotkeyTarget = (target: EventTarget | null) => {
  if (!isElementTarget(target)) {
    return true;
  }

  return !isProjectHistoryEditableTargetInfo(target);
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
