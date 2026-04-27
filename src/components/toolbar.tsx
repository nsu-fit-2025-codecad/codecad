import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePanesStore } from '@/store/panes-store';
import {
  Boxes,
  Package,
  Redo2,
  Share2,
  Shapes,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface ToolbarProps {
  onRunNesting: () => void;
  onCopyShareUrl: () => void;
  onUndoProject: () => void;
  onRedoProject: () => void;
  onToggleDemoGuide: () => void;
  canUndoProject?: boolean;
  canRedoProject?: boolean;
  isNesting?: boolean;
  isDemoGuideOpen?: boolean;
  className?: string;
}

export const Toolbar = ({
  onRunNesting,
  onCopyShareUrl,
  onUndoProject,
  onRedoProject,
  onToggleDemoGuide,
  canUndoProject = false,
  canRedoProject = false,
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
          variant="outline"
          onClick={onUndoProject}
          className="cursor-pointer"
          size="icon"
          title="Undo Project"
          aria-label="Undo Project"
          disabled={!canUndoProject}
        >
          <Undo2 />
        </Button>
        <Button
          variant="outline"
          onClick={onRedoProject}
          className="cursor-pointer"
          size="icon"
          title="Redo Project"
          aria-label="Redo Project"
          disabled={!canRedoProject}
        >
          <Redo2 />
        </Button>
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
