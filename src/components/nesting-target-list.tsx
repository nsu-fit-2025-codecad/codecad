import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { cn } from '@/lib/utils';

export interface NestingTargetOption {
  id: string;
  width?: number;
  height?: number;
}

const formatDimension = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return Number(value.toFixed(2)).toString();
};

interface NestingTargetListProps {
  models: NestingTargetOption[];
  selectedTargetModelId: string | null;
  onSelect: (modelId: string) => void;
}

export const NestingTargetList = ({
  models,
  selectedTargetModelId,
  onSelect,
}: NestingTargetListProps) => (
  <div className="flex min-h-[14rem] flex-col rounded-md border border-border/70 bg-muted/10 md:min-h-0">
    <div className="border-b border-border/70 px-3 py-2.5">
      <h3 className="text-base leading-none font-semibold">Target</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Choose the shape that parts will be placed into.
      </p>
    </div>
    <ScrollArea className="max-h-[60vh] md:min-h-0 md:flex-1">
      <ItemGroup className="gap-2 p-3">
        {models.map((model) => {
          const isSelected = selectedTargetModelId === model.id;

          return (
            <Item
              key={model.id}
              onClick={() => onSelect(model.id)}
              className={cn(
                'cursor-pointer border border-border/50 bg-background px-3 py-2 transition-[background-color,border-color,box-shadow] duration-150',
                isSelected && 'border-border bg-accent shadow-xs',
                !isSelected && 'hover:border-border hover:bg-accent/20'
              )}
            >
              <ItemHeader>
                <ItemContent className="gap-0.5">
                  <ItemTitle>{model.id}</ItemTitle>
                  <p className="text-xs text-muted-foreground">
                    W: {formatDimension(model.width)}, H:{' '}
                    {formatDimension(model.height)}
                  </p>
                </ItemContent>
              </ItemHeader>
            </Item>
          );
        })}
      </ItemGroup>
    </ScrollArea>
  </div>
);
