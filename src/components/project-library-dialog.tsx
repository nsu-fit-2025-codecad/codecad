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
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
            Save, restore, import, and export local Code CAD projects.
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
            Save as new
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
                className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{project.name}</p>
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
                    onClick={() => onOverwrite(project)}
                  >
                    <Save className="size-4" />
                    Save
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
                    onClick={() => {
                      const nextName = window.prompt(
                        'Project name',
                        project.name
                      );

                      if (nextName !== null) {
                        onRename(project, nextName);
                      }
                    }}
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
                      if (window.confirm(`Delete "${project.name}"?`)) {
                        onDelete(project);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
