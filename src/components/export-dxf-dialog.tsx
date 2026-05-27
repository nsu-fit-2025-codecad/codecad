import { useEffect, useMemo, useState } from 'react';
import type { IModel } from 'makerjs';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Model as AvailableModel } from '@/store/models-store';
import {
  type DxfExportRequest,
  type DxfExportScope,
  resolveDxfExportModelIds,
  validateDxfExportRequest,
} from '@/lib/export/dxf';

export interface NestingExportContext {
  targetModelId: string | null;
  packedIds: Set<string>;
  notFitIds: Set<string>;
  modelRevision: number;
}

type ExportFormat = 'dxf' | 'svg';

interface ExportDialogProps {
  open: boolean;
  model: IModel | null;
  models: AvailableModel[];
  selectedModelId: string | null;
  currentModelRevision: number;
  nestingExportContext: NestingExportContext | null;
  onOpenChange: (open: boolean) => void;
  onExportDxf: (request: DxfExportRequest) => void;
  onExportSvg: (request: DxfExportRequest) => void;
}

const scopeLabels: Record<DxfExportScope, string> = {
  all: 'All',
  selected: 'Selected',
  packed: 'Packed',
  'not-fit': 'Not fit',
  custom: 'Custom',
};

const scopeOrder: DxfExportScope[] = [
  'all',
  'selected',
  'packed',
  'not-fit',
  'custom',
];

export const ExportDialog = ({
  open,
  model,
  models,
  selectedModelId,
  currentModelRevision,
  nestingExportContext,
  onOpenChange,
  onExportDxf,
  onExportSvg,
}: ExportDialogProps) => {
  const [format, setFormat] = useState<ExportFormat>('dxf');
  const [scope, setScope] = useState<DxfExportScope>('all');
  const [customModelIds, setCustomModelIds] = useState<Set<string>>(
    () => new Set()
  );
  const [includeTargetModel, setIncludeTargetModel] = useState(false);
  const [filenamePrefix, setFilenamePrefix] = useState('codecad');

  const modelIds = useMemo(
    () => models.map((candidate) => candidate.id),
    [models]
  );
  const isNestingContextStale =
    nestingExportContext !== null &&
    nestingExportContext.modelRevision !== currentModelRevision;
  const packedIds = useMemo(
    () =>
      nestingExportContext && !isNestingContextStale
        ? nestingExportContext.packedIds
        : new Set<string>(),
    [isNestingContextStale, nestingExportContext]
  );
  const notFitIds = useMemo(
    () =>
      nestingExportContext && !isNestingContextStale
        ? nestingExportContext.notFitIds
        : new Set<string>(),
    [isNestingContextStale, nestingExportContext]
  );
  const targetModelId =
    nestingExportContext && !isNestingContextStale
      ? nestingExportContext.targetModelId
      : null;
  const shouldShowIncludeTarget = scope === 'packed';

  const request = useMemo<DxfExportRequest>(
    () => ({
      model,
      scope,
      selectedModelId,
      targetModelId,
      packedModelIds: packedIds,
      notFitModelIds: notFitIds,
      customModelIds,
      includeTargetModel: shouldShowIncludeTarget && includeTargetModel,
      filenamePrefix,
    }),
    [
      customModelIds,
      filenamePrefix,
      includeTargetModel,
      model,
      notFitIds,
      packedIds,
      scope,
      selectedModelId,
      shouldShowIncludeTarget,
      targetModelId,
    ]
  );
  const validation = useMemo(
    () => validateDxfExportRequest(request),
    [request]
  );
  const resolvedModelIds = useMemo(
    () => new Set(resolveDxfExportModelIds(request)),
    [request]
  );
  const warnings = [
    ...(isNestingContextStale && (scope === 'packed' || scope === 'not-fit')
      ? ['Last nesting result is stale because the model changed.']
      : []),
    ...validation.warnings,
  ];
  const canExport = validation.errors.length === 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormat('dxf');
    setScope('all');
    setCustomModelIds(new Set(modelIds));
    setIncludeTargetModel(false);
    setFilenamePrefix('codecad');
  }, [modelIds, open]);

  useEffect(() => {
    if (scope !== 'packed') {
      setIncludeTargetModel(false);
    }
  }, [scope]);

  const toggleCustomModel = (modelId: string, checked: boolean) => {
    setScope('custom');
    setCustomModelIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(modelId);
      } else {
        next.delete(modelId);
      }

      return next;
    });
  };

  const handleExport = () => {
    if (!canExport) {
      return;
    }

    if (format === 'svg') {
      onExportSvg(request);
      return;
    }

    onExportDxf(request);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Choose a file format for the current preview or model set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Format</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={format === 'dxf' ? 'default' : 'outline'}
                onClick={() => setFormat('dxf')}
                disabled={!model}
              >
                DXF
              </Button>
              <Button
                type="button"
                variant={format === 'svg' ? 'default' : 'outline'}
                onClick={() => setFormat('svg')}
                disabled={!model}
              >
                SVG
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="export-filename-prefix">Filename prefix</Label>
            <Input
              id="export-filename-prefix"
              value={filenamePrefix}
              onChange={(event) => setFilenamePrefix(event.target.value)}
            />
          </div>

          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Scope</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {scopeOrder.map((scopeId) => (
                  <Button
                    key={scopeId}
                    type="button"
                    variant={scope === scopeId ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setScope(scopeId)}
                    disabled={
                      (scopeId === 'selected' && !selectedModelId) ||
                      (scopeId === 'packed' && packedIds.size === 0) ||
                      (scopeId === 'not-fit' && notFitIds.size === 0)
                    }
                  >
                    {scopeLabels[scopeId]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              {shouldShowIncludeTarget && (
                <label className="flex items-center gap-2 pb-1 text-sm sm:col-start-2 sm:items-end">
                  <Checkbox
                    checked={includeTargetModel}
                    onCheckedChange={(checked) =>
                      setIncludeTargetModel(checked === true)
                    }
                    disabled={!targetModelId}
                  />
                  Include target
                </label>
              )}
            </div>

            <ScrollArea className="h-64 rounded-md border">
              <div className="space-y-1 p-2">
                {models.map((availableModel) => {
                  const isChecked =
                    scope === 'custom'
                      ? customModelIds.has(availableModel.id)
                      : resolvedModelIds.has(availableModel.id);

                  return (
                    <label
                      key={availableModel.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm',
                        resolvedModelIds.has(availableModel.id) &&
                          scope !== 'custom' &&
                          'bg-accent/50'
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          toggleCustomModel(availableModel.id, checked === true)
                        }
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {availableModel.id}
                      </span>
                      {availableModel.id === selectedModelId && (
                        <span className="text-xs text-muted-foreground">
                          selected
                        </span>
                      )}
                      {availableModel.fit === true && (
                        <span className="text-xs text-green-600">packed</span>
                      )}
                      {availableModel.fit === false && (
                        <span className="text-xs text-red-600">not fit</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
              <p className="font-medium">
                {validation.selectedCount} model
                {validation.selectedCount === 1 ? '' : 's'} selected
              </p>
              {validation.errors.map((message) => (
                <p key={message} className="mt-1 text-destructive">
                  {message}
                </p>
              ))}
              {warnings.map((message) => (
                <p key={message} className="mt-1 text-muted-foreground">
                  {message}
                </p>
              ))}
            </div>
          </>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/70 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={!canExport}>
            <Download />
            Export {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ExportDialog as ExportDxfDialog };
