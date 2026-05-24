import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useModelsStore } from '@/store/models-store';
import { Item, ItemContent, ItemGroup, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import React from 'react';

interface ModelsPaneProps {
  onClose: () => void;
  onSelectModel?: (modelId: string) => void;
  onClearSelectedModel?: () => void;
  className?: string;
}

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export const ModelsPane = ({
  onClose,
  onSelectModel,
  onClearSelectedModel,
  className,
}: ModelsPaneProps) => {
  const { models, selectedModelId, selectModel, clearSelectedModel } =
    useModelsStore();

  const toggleModelSelection = (modelId: string) => {
    if (selectedModelId === modelId) {
      (onClearSelectedModel ?? clearSelectedModel)();
      return;
    }

    (onSelectModel ?? selectModel)(modelId);
  };

  return (
    <Card className={cn('flex h-full flex-col overflow-hidden', className)}>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Models</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="cursor-pointer"
            aria-label="Collapse Models panel"
          >
            <X />
          </Button>
        </div>
      </CardHeader>
      <ScrollArea className="min-h-0 w-full flex-1">
        <CardContent>
          <ItemGroup className="gap-1.5">
            {models.map((model) => {
              const isSelected = selectedModelId === model.id;
              const fitStatus =
                model.fit === true
                  ? 'Packed'
                  : model.fit === false
                    ? 'Not fit'
                    : null;

              return (
                <Item
                  key={model.id}
                  onClick={() => toggleModelSelection(model.id)}
                  className={cn(
                    'cursor-pointer border border-border/50 bg-background px-2.5 py-2 transition-[background-color,border-color,box-shadow] duration-150',
                    isSelected && 'bg-accent border-border shadow-xs',
                    !isSelected && 'hover:bg-accent/20 hover:border-border'
                  )}
                >
                  <ItemContent className="min-w-0 gap-1">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <ItemTitle
                        className={cn(
                          'min-w-0 truncate',
                          model.fit === true && 'text-green-500',
                          model.fit === false && 'text-red-500'
                        )}
                        title={model.id}
                      >
                        {model.id}
                      </ItemTitle>
                      {fitStatus && (
                        <span
                          className={cn(
                            'shrink-0 text-xs font-medium',
                            model.fit === true && 'text-green-600',
                            model.fit === false && 'text-red-600'
                          )}
                        >
                          {fitStatus}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(model.width)} x {formatNumber(model.height)}
                      {model.diagnostics?.bounds && (
                        <>
                          {' · Area '}
                          {formatNumber(model.diagnostics.bounds.area)}
                        </>
                      )}
                    </div>
                    {model.diagnostics && (
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {model.diagnostics.warnings.map((warning) => (
                          <div key={warning} className="text-amber-600">
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
