import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePanesStore } from '@/store/panes-store';
import { Boxes, Package, SlidersHorizontal } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface ToolbarProps {
  onRunNesting: () => void;
  className?: string;
}

export const Toolbar = ({ onRunNesting, className }: ToolbarProps) => {
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
        <Button
          variant="outline"
          onClick={onRunNesting}
          className="cursor-pointer"
          size="icon"
          title="Run Nesting"
        >
          <Package />
        </Button>
        <ThemeToggle />
      </CardContent>
    </Card>
  );
};
