import React, { useEffect, useState } from 'react';
import { CodeEditor } from '@/components/code-editor';
import { VisualizationArea } from '@/components/visualization-area';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { useDefaultLayout } from 'react-resizable-panels';

interface WorkbenchLayoutProps {
  svgString: string;
  selectedModelId: string | null;
  onExecuteCode: () => void;
  className?: string;
}

export const WorkbenchLayout = ({
  svgString,
  selectedModelId,
  onExecuteCode,
  className,
}: WorkbenchLayoutProps) => {
  const [isDesktopLayout, setIsDesktopLayout] = useState<boolean>(
    () => window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktopLayout(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const layoutStorageId = isDesktopLayout
    ? 'home-workbench-layout-desktop'
    : 'home-workbench-layout-mobile';
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: layoutStorageId,
    panelIds: ['code-editor-panel', 'visualization-panel'],
  });

  return (
    <div className={cn('h-full w-full', className)}>
      <ResizablePanelGroup
        key={layoutStorageId}
        id={layoutStorageId}
        orientation={isDesktopLayout ? 'horizontal' : 'vertical'}
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="h-full w-full"
      >
        <ResizablePanel
          id="code-editor-panel"
          defaultSize={isDesktopLayout ? 45 : 40}
          minSize={isDesktopLayout ? 25 : 30}
          className="min-h-0 min-w-0"
        >
          <div className="h-full w-full bg-white px-2 pt-4">
            <CodeEditor onExecuteCode={onExecuteCode} />
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-border/80 transition-colors hover:bg-border"
        />
        <ResizablePanel
          id="visualization-panel"
          defaultSize={isDesktopLayout ? 55 : 60}
          minSize={isDesktopLayout ? 30 : 35}
          className="min-h-0 min-w-0"
        >
          <VisualizationArea
            svgString={svgString}
            selectedModelId={selectedModelId}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
