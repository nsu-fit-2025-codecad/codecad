import { z } from 'zod';
import {
  createProjectStateSnapshot,
  projectStateSchema,
  type ProjectStateInput,
  type ProjectStateSnapshot,
} from '@/lib/project-state/contract';

export const LOCAL_PROJECTS_STORAGE_KEY = 'codecad-local-projects-v1';
export const LOCAL_PROJECT_FILE_KIND = 'codecad.project';
export const LOCAL_PROJECT_FILE_VERSION = 1;

export interface LocalProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  state: ProjectStateSnapshot;
}

export interface LocalProjectFile {
  kind: typeof LOCAL_PROJECT_FILE_KIND;
  version: typeof LOCAL_PROJECT_FILE_VERSION;
  project: LocalProjectRecord;
}

const localProjectRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  state: projectStateSchema,
});

const localProjectFileSchema = z.object({
  kind: z.literal(LOCAL_PROJECT_FILE_KIND),
  version: z.literal(LOCAL_PROJECT_FILE_VERSION),
  project: localProjectRecordSchema,
});

const createProjectId = (now = Date.now()) =>
  `project-${now}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeName = (name: string) => name.trim() || 'Untitled project';

const sortProjects = (projects: readonly LocalProjectRecord[]) =>
  [...projects].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );

export const createLocalProjectRecord = ({
  name,
  state,
  id = createProjectId(),
  now = new Date(),
}: {
  name: string;
  state: ProjectStateInput | ProjectStateSnapshot;
  id?: string;
  now?: Date;
}): LocalProjectRecord => {
  const timestamp = now.toISOString();

  return {
    id,
    name: normalizeName(name),
    createdAt: timestamp,
    updatedAt: timestamp,
    state: createProjectStateSnapshot(state),
  };
};

export const upsertLocalProject = (
  projects: readonly LocalProjectRecord[],
  project: LocalProjectRecord
): LocalProjectRecord[] =>
  sortProjects([
    project,
    ...projects.filter((candidate) => candidate.id !== project.id),
  ]);

export const updateLocalProjectState = ({
  projects,
  projectId,
  state,
  now = new Date(),
}: {
  projects: readonly LocalProjectRecord[];
  projectId: string;
  state: ProjectStateInput | ProjectStateSnapshot;
  now?: Date;
}): LocalProjectRecord[] =>
  sortProjects(
    projects.map((project) =>
      project.id === projectId
        ? {
            ...project,
            updatedAt: now.toISOString(),
            state: createProjectStateSnapshot(state),
          }
        : project
    )
  );

export const renameLocalProject = ({
  projects,
  projectId,
  name,
  now = new Date(),
}: {
  projects: readonly LocalProjectRecord[];
  projectId: string;
  name: string;
  now?: Date;
}): LocalProjectRecord[] =>
  sortProjects(
    projects.map((project) =>
      project.id === projectId
        ? {
            ...project,
            name: normalizeName(name),
            updatedAt: now.toISOString(),
          }
        : project
    )
  );

export const duplicateLocalProject = ({
  project,
  name = `${project.name} copy`,
  now = new Date(),
}: {
  project: LocalProjectRecord;
  name?: string;
  now?: Date;
}): LocalProjectRecord =>
  createLocalProjectRecord({
    name,
    state: project.state,
    now,
  });

export const deleteLocalProject = (
  projects: readonly LocalProjectRecord[],
  projectId: string
): LocalProjectRecord[] =>
  projects.filter((project) => project.id !== projectId);

export const serializeLocalProject = (project: LocalProjectRecord): string =>
  JSON.stringify(
    {
      kind: LOCAL_PROJECT_FILE_KIND,
      version: LOCAL_PROJECT_FILE_VERSION,
      project,
    } satisfies LocalProjectFile,
    null,
    2
  );

export const parseLocalProjectFile = (
  content: string
): LocalProjectFile | null => {
  try {
    const parsed = localProjectFileSchema.safeParse(JSON.parse(content));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const readLocalProjects = (
  storage: Pick<Storage, 'getItem'> = window.localStorage
): LocalProjectRecord[] => {
  try {
    const rawValue = storage.getItem(LOCAL_PROJECTS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = z
      .array(localProjectRecordSchema)
      .safeParse(JSON.parse(rawValue));

    return parsed.success ? sortProjects(parsed.data) : [];
  } catch {
    return [];
  }
};

export const writeLocalProjects = (
  projects: readonly LocalProjectRecord[],
  storage: Pick<Storage, 'setItem'> = window.localStorage
) => {
  storage.setItem(
    LOCAL_PROJECTS_STORAGE_KEY,
    JSON.stringify(sortProjects(projects))
  );
};
