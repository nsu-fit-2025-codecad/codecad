import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useModelsStore } from '@/store/models-store';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemHeader,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import React from 'react';
import makerjs from "makerjs";

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
  const { models, finalModel } = useModelsStore();

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
          <ItemGroup>
            {models.map((model, index) => (
              <React.Fragment key={model.id}>
                <Item className="px-0">
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
                    Width: {model.width} Height: {model.width}
                  </ItemContent>
                </Item>
                {index !== models.length - 1 && <ItemSeparator />}
              </React.Fragment>
            ))}
          </ItemGroup>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
