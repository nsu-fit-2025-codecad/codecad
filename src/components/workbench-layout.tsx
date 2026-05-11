import React, { type ReactNode, useEffect, useState } from 'react';
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
  onCodeChange: (code?: string) => void;
  onAutorunChange: (autorun: boolean) => void;
  modelsPane?: ReactNode;
  parametersPane?: ReactNode;
  className?: string;
}

export const WorkbenchLayout = ({
  svgString,
  selectedModelId,
  onExecuteCode,
  onCodeChange,
  onAutorunChange,
  modelsPane,
  parametersPane,
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

  const editorLayoutStorageId = isDesktopLayout
    ? 'home-workbench-layout-desktop'
    : 'home-workbench-layout-mobile';
  const {
    defaultLayout: editorDefaultLayout,
    onLayoutChanged: onEditorLayoutChanged,
  } = useDefaultLayout({
    id: editorLayoutStorageId,
    panelIds: ['code-editor-panel', 'visualization-panel'],
  });
  const shellPanelIds = [
    ...(modelsPane ? ['models-panel'] : []),
    'main-workbench-panel',
    ...(parametersPane ? ['parameters-panel'] : []),
  ];
  const shellLayoutStorageId = [
    'home-workbench-shell-v2',
    isDesktopLayout ? 'desktop' : 'mobile',
    modelsPane ? 'models' : 'no-models',
    parametersPane ? 'parameters' : 'no-parameters',
  ].join('-');
  const {
    defaultLayout: shellDefaultLayout,
    onLayoutChanged: onShellLayoutChanged,
  } = useDefaultLayout({
    id: shellLayoutStorageId,
    panelIds: shellPanelIds,
  });

  const workbench = (
    <div className="h-full w-full">
      <ResizablePanelGroup
        key={editorLayoutStorageId}
        id={editorLayoutStorageId}
        orientation={isDesktopLayout ? 'horizontal' : 'vertical'}
        defaultLayout={editorDefaultLayout}
        onLayoutChanged={onEditorLayoutChanged}
        className="h-full w-full"
      >
        <ResizablePanel
          id="code-editor-panel"
          defaultSize={isDesktopLayout ? '45%' : '40%'}
          minSize={isDesktopLayout ? '25%' : '30%'}
          className="min-h-0 min-w-0"
        >
          <div className="h-full w-full bg-background px-2 pt-4">
            <CodeEditor
              onExecuteCode={onExecuteCode}
              onCodeChange={onCodeChange}
              onAutorunChange={onAutorunChange}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="bg-border/80 transition-colors hover:bg-border"
        />
        <ResizablePanel
          id="visualization-panel"
          defaultSize={isDesktopLayout ? '55%' : '60%'}
          minSize={isDesktopLayout ? '30%' : '35%'}
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

  if (!modelsPane && !parametersPane) {
    return <div className={cn('h-full w-full', className)}>{workbench}</div>;
  }

  return (
    <div className={cn('h-full w-full', className)}>
      <ResizablePanelGroup
        key={shellLayoutStorageId}
        id={shellLayoutStorageId}
        orientation={isDesktopLayout ? 'horizontal' : 'vertical'}
        defaultLayout={shellDefaultLayout}
        onLayoutChanged={onShellLayoutChanged}
        className="h-full w-full"
      >
        {modelsPane && (
          <>
            <ResizablePanel
              id="models-panel"
              defaultSize={isDesktopLayout ? '18%' : '22%'}
              minSize={isDesktopLayout ? '14%' : '16%'}
              maxSize={isDesktopLayout ? '34%' : '35%'}
              className="min-h-0 min-w-0"
            >
              {modelsPane}
            </ResizablePanel>
            <ResizableHandle
              withHandle
              className="bg-border/80 transition-colors hover:bg-border"
            />
          </>
        )}
        <ResizablePanel
          id="main-workbench-panel"
          defaultSize={`${100 - (modelsPane ? 18 : 0) - (parametersPane ? 18 : 0)}%`}
          minSize={isDesktopLayout ? '40%' : '35%'}
          className="min-h-0 min-w-0"
        >
          {workbench}
        </ResizablePanel>
        {parametersPane && (
          <>
            <ResizableHandle
              withHandle
              className="bg-border/80 transition-colors hover:bg-border"
            />
            <ResizablePanel
              id="parameters-panel"
              defaultSize={isDesktopLayout ? '18%' : '24%'}
              minSize={isDesktopLayout ? '14%' : '18%'}
              maxSize={isDesktopLayout ? '34%' : '40%'}
              className="min-h-0 min-w-0"
            >
              {parametersPane}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};
