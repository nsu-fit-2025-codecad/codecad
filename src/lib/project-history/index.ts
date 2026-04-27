import {
  createProjectStateSnapshot,
  type ProjectStateInput,
  type ProjectStateSnapshot,
} from '@/lib/project-state/contract';

export const DEFAULT_PROJECT_HISTORY_LIMIT = 50;

export interface ProjectHistoryOptions {
  limit?: number;
}

export interface ProjectHistory {
  push: (snapshot: ProjectStateInput | ProjectStateSnapshot) => boolean;
  undo: () => ProjectStateSnapshot | null;
  redo: () => ProjectStateSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearRedo: () => boolean;
  current: () => ProjectStateSnapshot | null;
  size: () => number;
}

const cloneSnapshot = (
  snapshot: ProjectStateInput | ProjectStateSnapshot
): ProjectStateSnapshot =>
  structuredClone(createProjectStateSnapshot(snapshot));

const areSnapshotsEqual = (
  left: ProjectStateSnapshot,
  right: ProjectStateSnapshot
) => JSON.stringify(left) === JSON.stringify(right);

export const createProjectHistory = ({
  limit = DEFAULT_PROJECT_HISTORY_LIMIT,
}: ProjectHistoryOptions = {}): ProjectHistory => {
  const maxEntries = Math.max(1, Math.floor(limit));
  let entries: ProjectStateSnapshot[] = [];
  let cursor = -1;

  const readCurrentEntry = () =>
    cursor >= 0 && cursor < entries.length ? entries[cursor] : null;

  return {
    push(snapshot) {
      const nextSnapshot = cloneSnapshot(snapshot);
      const currentEntry = readCurrentEntry();

      if (currentEntry && areSnapshotsEqual(currentEntry, nextSnapshot)) {
        return false;
      }

      if (cursor < entries.length - 1) {
        entries = entries.slice(0, cursor + 1);
      }

      entries.push(nextSnapshot);

      if (entries.length > maxEntries) {
        entries = entries.slice(entries.length - maxEntries);
      }

      cursor = entries.length - 1;

      return true;
    },

    undo() {
      if (cursor <= 0) {
        return null;
      }

      cursor -= 1;

      return cloneSnapshot(entries[cursor]);
    },

    redo() {
      if (cursor >= entries.length - 1) {
        return null;
      }

      cursor += 1;

      return cloneSnapshot(entries[cursor]);
    },

    canUndo() {
      return cursor > 0;
    },

    canRedo() {
      return cursor >= 0 && cursor < entries.length - 1;
    },

    clearRedo() {
      if (cursor >= entries.length - 1) {
        return false;
      }

      entries = entries.slice(0, cursor + 1);

      return true;
    },

    current() {
      const currentEntry = readCurrentEntry();

      return currentEntry ? cloneSnapshot(currentEntry) : null;
    },

    size() {
      return entries.length;
    },
  };
};
