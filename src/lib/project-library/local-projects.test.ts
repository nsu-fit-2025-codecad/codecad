import { describe, expect, it } from 'vitest';
import {
  createLocalProjectRecord,
  deleteLocalProject,
  duplicateLocalProject,
  parseLocalProjectFile,
  readLocalProjects,
  renameLocalProject,
  serializeLocalProject,
  updateLocalProjectState,
  upsertLocalProject,
  writeLocalProjects,
  LOCAL_PROJECTS_STORAGE_KEY,
} from '@/lib/project-library/local-projects';
import type { ProjectStateInput } from '@/lib/project-state/contract';

const stateFixture: ProjectStateInput = {
  code: 'return cad.sketch({ rect: cad.rect(10, 10) });',
  parameters: [],
  editorSettings: { autorun: true },
};

const createMemoryStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
};

describe('local project records', () => {
  it('saves, serializes, and parses a project file', () => {
    const project = createLocalProjectRecord({
      id: 'project-a',
      name: ' Test project ',
      state: stateFixture,
      now: new Date('2026-05-12T00:00:00.000Z'),
    });
    const parsed = parseLocalProjectFile(serializeLocalProject(project));

    expect(project.name).toBe('Test project');
    expect(parsed?.project).toEqual(project);
  });

  it('round-trips projects through storage sorted by update time', () => {
    const storage = createMemoryStorage();
    const older = createLocalProjectRecord({
      id: 'older',
      name: 'Older',
      state: stateFixture,
      now: new Date('2026-05-12T00:00:00.000Z'),
    });
    const newer = createLocalProjectRecord({
      id: 'newer',
      name: 'Newer',
      state: stateFixture,
      now: new Date('2026-05-12T01:00:00.000Z'),
    });

    writeLocalProjects([older, newer], storage);

    expect(storage.values.has(LOCAL_PROJECTS_STORAGE_KEY)).toBe(true);
    expect(readLocalProjects(storage).map((project) => project.id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('updates, renames, duplicates, and deletes records immutably', () => {
    const project = createLocalProjectRecord({
      id: 'project-a',
      name: 'Original',
      state: stateFixture,
      now: new Date('2026-05-12T00:00:00.000Z'),
    });
    const updated = updateLocalProjectState({
      projects: [project],
      projectId: project.id,
      state: { ...stateFixture, code: 'return 1;' },
      now: new Date('2026-05-12T01:00:00.000Z'),
    });
    const renamed = renameLocalProject({
      projects: updated,
      projectId: project.id,
      name: 'Renamed',
      now: new Date('2026-05-12T02:00:00.000Z'),
    });
    const duplicate = duplicateLocalProject({
      project: renamed[0],
      now: new Date('2026-05-12T03:00:00.000Z'),
    });
    const withDuplicate = upsertLocalProject(renamed, duplicate);

    expect(renamed[0].name).toBe('Renamed');
    expect(renamed[0].state.code).toBe('return 1;');
    expect(duplicate.id).not.toBe(project.id);
    expect(withDuplicate).toHaveLength(2);
    expect(deleteLocalProject(withDuplicate, project.id)).toHaveLength(1);
  });

  it('rejects invalid imports', () => {
    expect(parseLocalProjectFile('{"kind":"wrong"}')).toBeNull();
    expect(parseLocalProjectFile('not json')).toBeNull();
  });
});
