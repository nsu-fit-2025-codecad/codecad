import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePanesStore } from '@/store/panes-store';
import {
  Boxes,
  Package,
  Share2,
  Shapes,
  SlidersHorizontal,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface ToolbarProps {
  onRunNesting: () => void;
  onCopyShareUrl: () => void;
  onToggleDemoGuide: () => void;
  isNesting?: boolean;
  isDemoGuideOpen?: boolean;
  className?: string;
}

export const Toolbar = ({
  onRunNesting,
  onCopyShareUrl,
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
          variant="outline"
          onClick={onCopyShareUrl}
          className="cursor-pointer"
          size="icon"
          title="Copy Share URL"
          aria-label="Copy Share URL"
        >
          <Share2 />
        </Button>
        <Button
          variant={isDemoGuideOpen ? 'default' : 'outline'}
          onClick={onToggleDemoGuide}
          className="cursor-pointer"
          size="icon"
          aria-label={isDemoGuideOpen ? 'Close demo panel' : 'Open demo panel'}
          title={isDemoGuideOpen ? 'Close demo panel' : 'Open demo panel'}
        >
          <Shapes />
        </Button>
        <ThemeToggle />
      </CardContent>
    </Card>
  );
};
