import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useModelsStore } from '@/store/models-store';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
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
          >
            <X />
          </Button>
        </div>
      </CardHeader>
      <ScrollArea className="min-h-0 w-full flex-1">
        <CardContent>
          <ItemGroup className="gap-2">
            {models.map((model) => {
              const isSelected = selectedModelId === model.id;

              return (
                <Item
                  key={model.id}
                  onClick={() => toggleModelSelection(model.id)}
                  className={cn(
                    'cursor-pointer px-3 py-2 border border-border/50 bg-background transition-[background-color,border-color,box-shadow] duration-150',
                    isSelected && 'bg-accent border-border shadow-xs',
                    !isSelected && 'hover:bg-accent/20 hover:border-border'
                  )}
                >
                  <ItemHeader>
                    <ItemTitle
                      className={cn(
                        model.fit === true && 'text-green-500',
                        model.fit === false && 'text-red-500'
                      )}
                    >
                      {model.id}
                    </ItemTitle>
                  </ItemHeader>
                  <ItemContent className="space-y-2">
                    <div>
                      Width: {formatNumber(model.width)} Height:{' '}
                      {formatNumber(model.height)}
                    </div>
                    {model.diagnostics && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {model.diagnostics.layers.length > 0 && (
                          <div>
                            Layers: {model.diagnostics.layers.join(', ')}
                          </div>
                        )}
                        {model.diagnostics.bounds && (
                          <div>
                            Area: {formatNumber(model.diagnostics.bounds.area)}
                          </div>
                        )}
                        {model.diagnostics.warnings.map((warning) => (
                          <div key={warning} className="text-amber-600">
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                    {model.fit === true && (
                      <div className="text-xs font-medium text-green-600">
                        Packed
                      </div>
                    )}
                    {model.fit === false && (
                      <div className="text-xs font-medium text-red-600">
                        Not fit
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
