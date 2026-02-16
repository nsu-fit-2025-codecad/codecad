import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePanesStore } from '@/store/panes-store';
import { Boxes, SlidersHorizontal } from 'lucide-react';

interface ToolbarProps {
  className?: string;
}

export const Toolbar = ({ className }: ToolbarProps) => {
  const {
    toggleModelsPane,
    toggleParametersPane,
    isModelsPaneOpen,
    isParametersPaneOpen,
  } = usePanesStore();

  return (
    <Card className={cn(className)}>
      <CardContent className="p-2 flex items-center gap-2">
        <Button
          variant={isModelsPaneOpen ? 'default' : 'outline'}
          onClick={toggleModelsPane}
          className="cursor-pointer"
          size="icon"
          title={isModelsPaneOpen ? 'Close Models pane' : 'Open Models pane'}
        >
          <Boxes />
        </Button>
        <Button
          variant={isParametersPaneOpen ? 'default' : 'outline'}
          onClick={toggleParametersPane}
          className="cursor-pointer"
          size="icon"
          title={
            isParametersPaneOpen
              ? 'Close Parameters pane'
              : 'Open Parameters pane'
          }
        >
          <SlidersHorizontal />
        </Button>
      </CardContent>
    </Card>
  );
};
