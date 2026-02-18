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
  onRunNesting: () => void;
  onExportDXF: () => void;
  onClose: () => void;
  className?: string;
}

export const ModelsPane = ({
  onRunNesting,
  onExportDXF,
  onClose,
  className,
}: ModelsPaneProps) => {
  const { models, selectedModelId, selectModel, clearSelectedModel } =
    useModelsStore();

  const toggleModelSelection = (modelId: string) => {
    if (selectedModelId === modelId) {
      clearSelectedModel();
      return;
    }

    selectModel(modelId);
  };

  return (
    <Card className={cn(className, 'flex flex-col overflow-hidden')}>
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
        <Button className="cursor-pointer" onClick={onRunNesting}>
          Run Nesting
        </Button>
        <Button className="cursor-pointer" onClick={onExportDXF}>
          Export DXF
        </Button>
      </CardHeader>
      <ScrollArea className="w-full">
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
                  <ItemContent>
                    Width: {model.width} Height: {model.height}
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
