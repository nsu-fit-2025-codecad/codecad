import React, { useRef, useState } from 'react';
import {
  Copy,
  Download,
  FolderOpen,
  Pencil,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LocalProjectRecord } from '@/lib/project-library/local-projects';

interface ProjectLibraryDialogProps {
  open: boolean;
  projects: LocalProjectRecord[];
  currentProjectId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaveAs: (name: string) => void;
  onOverwrite: (project: LocalProjectRecord) => void;
  onLoad: (project: LocalProjectRecord) => void;
  onDuplicate: (project: LocalProjectRecord) => void;
  onRename: (project: LocalProjectRecord, name: string) => void;
  onDelete: (project: LocalProjectRecord) => void;
  onExport: (project: LocalProjectRecord) => void;
  onImport: (content: string) => void;
}

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDate));

export const ProjectLibraryDialog = ({
  open,
  projects,
  currentProjectId,
  onOpenChange,
  onSaveAs,
  onOverwrite,
  onLoad,
  onDuplicate,
  onRename,
  onDelete,
  onExport,
  onImport,
}: ProjectLibraryDialogProps) => {
  const [name, setName] = useState('Untitled project');
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(
    null
  );
  const [renameValue, setRenameValue] = useState('');
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<
    string | null
  >(null);
  const [pendingOverwriteProjectId, setPendingOverwriteProjectId] = useState<
    string | null
  >(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const pendingOverwriteProject =
    projects.find((project) => project.id === pendingOverwriteProjectId) ??
    null;

  const startRename = (project: LocalProjectRecord) => {
    setPendingDeleteProjectId(null);
    setPendingOverwriteProjectId(null);
    setRenamingProjectId(project.id);
    setRenameValue(project.name);
  };

  const commitRename = (project: LocalProjectRecord) => {
    const nextName = renameValue.trim();

    if (!nextName) {
      return;
    }

    onRename(project, nextName);
    setRenamingProjectId(null);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    void file.text().then(onImport);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Project Library</DialogTitle>
          <DialogDescription>
            Save the current workspace as a new slot, or explicitly update an
            existing saved project.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Project name"
          />
          <Button type="button" onClick={() => onSaveAs(name)}>
            <Save className="size-4" />
            Save current as new
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="size-4" />
            Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".codecad.json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        <ScrollArea className="min-h-0 flex-1 rounded-md border">
          <div className="space-y-2 p-2">
            {projects.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                No saved projects yet.
              </p>
            )}
            {projects.map((project) => (
              <div
                key={project.id}
                className="space-y-3 rounded-md border bg-background p-3"
              >
                <div className="min-w-0 space-y-1">
                  {renamingProjectId === project.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        aria-label={`Rename ${project.name}`}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            commitRename(project);
                          }
                          if (event.key === 'Escape') {
                            setRenamingProjectId(null);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => commitRename(project)}
                        disabled={!renameValue.trim()}
                      >
                        Apply
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRenamingProjectId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate font-medium">
                        {project.name}
                      </p>
                      {project.id === currentProjectId && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          Current
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(project.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onLoad(project)}
                  >
                    <FolderOpen className="size-4" />
                    Load
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRenamingProjectId(null);
                      setPendingDeleteProjectId(null);
                      setPendingOverwriteProjectId(project.id);
                    }}
                  >
                    <Save className="size-4" />
                    Overwrite
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onDuplicate(project)}
                  >
                    <Copy className="size-4" />
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startRename(project)}
                  >
                    <Pencil className="size-4" />
                    Rename
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onExport(project)}
                  >
                    <Download className="size-4" />
                    Export
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRenamingProjectId(null);
                      setPendingOverwriteProjectId(null);
                      setPendingDeleteProjectId(project.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
                {pendingDeleteProjectId === project.id && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    <p className="font-medium">Delete {project.name}?</p>
                    <p className="mt-1 text-muted-foreground">
                      This removes the saved slot from local storage. The
                      currently open workspace is not changed.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          onDelete(project);
                          setPendingDeleteProjectId(null);
                        }}
                      >
                        Delete project
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingDeleteProjectId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>

      <Dialog
        open={pendingOverwriteProject !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingOverwriteProjectId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overwrite saved project?</DialogTitle>
            <DialogDescription>
              This will replace {pendingOverwriteProject?.name} with the project
              currently open in the editor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingOverwriteProjectId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (pendingOverwriteProject) {
                  onOverwrite(pendingOverwriteProject);
                }
                setPendingOverwriteProjectId(null);
              }}
            >
              Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
