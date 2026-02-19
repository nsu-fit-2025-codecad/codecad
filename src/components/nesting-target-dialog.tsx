import { useState } from 'react';
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
import { cn } from '@/lib/utils';

interface NestingTargetDialogProps {
  open: boolean;
  modelIds: string[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetModelId: string) => void;
}

export const NestingTargetDialog = ({
  open,
  modelIds,
  onOpenChange,
  onConfirm,
}: NestingTargetDialogProps) => {
  const [selectedTargetModelId, setSelectedTargetModelId] = useState<
    string | null
  >(null);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);

    if (!isOpen) {
      setSelectedTargetModelId(null);
    }
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  const handleConfirm = () => {
    if (!selectedTargetModelId) {
      return;
    }

    onConfirm(selectedTargetModelId);
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
        <ScrollArea className="max-h-80 pr-3">
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
