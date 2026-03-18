import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePanesStore } from '@/store/panes-store';
import { Boxes, Package, SlidersHorizontal } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface ToolbarProps {
  onRunNesting: () => void;
  onToggleDemoGuide: () => void;
  isNesting?: boolean;
  isDemoGuideOpen?: boolean;
  className?: string;
}

export const Toolbar = ({
  onRunNesting,
  onToggleDemoGuide,
  isNesting = false,
  isDemoGuideOpen = false,
  className,
}: ToolbarProps) => {
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
          title={isNesting ? 'Nesting in progress' : 'Run Nesting'}
          disabled={isNesting}
        >
          <Package />
        </Button>
        <Button
          variant={isDemoGuideOpen ? 'default' : 'outline'}
          onClick={onToggleDemoGuide}
          className="cursor-pointer"
          size="sm"
          title={
            isDemoGuideOpen ? 'Close MVP demo guide' : 'Open MVP demo guide'
          }
        >
          MVP
        </Button>
        <ThemeToggle />
      </CardContent>
    </Card>
  );
};
