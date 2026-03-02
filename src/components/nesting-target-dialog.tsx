import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Item, ItemGroup, ItemHeader, ItemTitle } from '@/components/ui/item';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PackingOptions } from '@/lib/nesting';

interface NestingTargetDialogProps {
  open: boolean;
  modelIds: string[];
  initialTargetModelId?: string | null;
  initialOptions?: PackingOptions;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetModelId: string, options: PackingOptions) => void;
}

export const NestingTargetDialog = ({
  open,
  modelIds,
  initialTargetModelId = null,
  initialOptions,
  onOpenChange,
  onConfirm,
}: NestingTargetDialogProps) => {
  const [selectedTargetModelId, setSelectedTargetModelId] = useState<
    string | null
  >(initialTargetModelId);
  const [allowRotation, setAllowRotation] = useState(
    initialOptions?.allowRotation ?? true
  );
  const [gapValue, setGapValue] = useState(String(initialOptions?.gap ?? 0));

  useEffect(() => {
    if (!open) {
      return;
    }

    const hasInitialTarget =
      initialTargetModelId !== null && modelIds.includes(initialTargetModelId);

    setSelectedTargetModelId(hasInitialTarget ? initialTargetModelId : null);
    setAllowRotation(initialOptions?.allowRotation ?? true);
    setGapValue(String(initialOptions?.gap ?? 0));
  }, [
    initialOptions?.allowRotation,
    initialOptions?.gap,
    initialTargetModelId,
    modelIds,
    open,
  ]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  const handleConfirm = () => {
    if (!selectedTargetModelId) {
      return;
    }

    const parsedGap = Number(gapValue);
    const normalizedGap =
      Number.isFinite(parsedGap) && parsedGap >= 0 ? parsedGap : 0;

    onConfirm(selectedTargetModelId, {
      allowRotation,
      gap: normalizedGap,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Nesting Target</DialogTitle>
          <DialogDescription>
            Choose a model that will be used as the nesting area.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80">
          <ItemGroup className="gap-2">
            {modelIds.map((modelId) => {
              const isSelected = selectedTargetModelId === modelId;

              return (
                <Item
                  key={modelId}
                  onClick={() => setSelectedTargetModelId(modelId)}
                  className={cn(
                    'cursor-pointer px-3 py-2 border border-border/50 bg-background transition-[background-color,border-color,box-shadow] duration-150',
                    isSelected && 'bg-accent border-border shadow-xs',
                    !isSelected && 'hover:bg-accent/20 hover:border-border'
                  )}
                >
                  <ItemHeader>
                    <ItemTitle>{modelId}</ItemTitle>
                  </ItemHeader>
                </Item>
              );
            })}
          </ItemGroup>
        </ScrollArea>
        <div className="rounded-md border border-border/70 bg-muted/10">
          <div className="border-b border-border/70 px-3 py-2.5">
            <h3 className="text-base leading-none font-semibold">
              Nesting Settings
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Applied to this nesting run.
            </p>
          </div>
          <div className="space-y-4 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="nesting-allow-rotation"
                className="text-sm font-medium cursor-pointer"
              >
                Allow 90° rotation
              </Label>
              <Checkbox
                id="nesting-allow-rotation"
                checked={allowRotation}
                onCheckedChange={(checked) =>
                  setAllowRotation(checked === true)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nesting-gap" className="text-sm font-medium">
                Gap
              </Label>
              <Input
                id="nesting-gap"
                type="number"
                min={0}
                step="0.1"
                value={gapValue}
                onChange={(event) => setGapValue(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Distance between packed parts in model units.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} className="w-25">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTargetModelId}
            className="w-25"
          >
            Run Nesting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
