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

interface ModelsPaneProps {
  onRunNesting: () => void;
  className?: string;
}

export const ModelsPane = ({ onRunNesting, className }: ModelsPaneProps) => {
  const { models } = useModelsStore();

  return (
    <Card className={cn(className, 'flex flex-col overflow-hidden')}>
      <CardHeader>
        <CardTitle>Models</CardTitle>
        <Button className="cursor-pointer" onClick={onRunNesting}>
          Run Nesting
        </Button>
      </CardHeader>
      <ScrollArea className="w-full">
        <CardContent>
          <ItemGroup>
            {models.map((model, index) => (
              <>
                <Item key={model.id} className="px-0">
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
              </>
            ))}
          </ItemGroup>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
