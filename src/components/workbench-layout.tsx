import React, { type ReactNode, useEffect, useState } from 'react';
import { CodeEditor } from '@/components/code-editor';
import { VisualizationArea } from '@/components/visualization-area';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import {
  Boxes,
  PanelLeftOpen,
  PanelRightOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { useDefaultLayout } from 'react-resizable-panels';

interface WorkbenchLayoutProps {
  svgString: string;
  selectedModelId: string | null;
  onExecuteCode: () => void;
  onCodeChange: (code?: string) => void;
  onAutorunChange: (autorun: boolean) => void;
  modelsPane?: ReactNode;
  parametersPane?: ReactNode;
  isModelsPaneOpen: boolean;
  isParametersPaneOpen: boolean;
  onOpenModelsPane: () => void;
  onOpenParametersPane: () => void;
  className?: string;
}

interface PaneRailProps {
  label: string;
  side: 'left' | 'right';
  onOpen: () => void;
  icon: ReactNode;
}

const PaneRail = ({ label, side, onOpen, icon }: PaneRailProps) => (
  <div className="flex h-full w-full items-center justify-center rounded-2xl border border-border/70 bg-card/95 shadow-sm">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onOpen}
      className="h-11 w-11 cursor-pointer rounded-xl"
      title={`Open ${label}`}
      aria-label={`Open ${label}`}
    >
      <span className="relative">
        {icon}
        {side === 'left' ? (
          <PanelLeftOpen className="absolute -right-2 -bottom-2 size-3 rounded-full bg-card" />
        ) : (
          <PanelRightOpen className="absolute -right-2 -bottom-2 size-3 rounded-full bg-card" />
        )}
      </span>
    </Button>
  </div>
);

export const WorkbenchLayout = ({
  svgString,
  selectedModelId,
  onExecuteCode,
  onCodeChange,
  onAutorunChange,
  modelsPane,
  parametersPane,
  isModelsPaneOpen,
  isParametersPaneOpen,
  onOpenModelsPane,
  onOpenParametersPane,
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
    'parameters-panel',
    'main-workbench-panel',
    'models-panel',
  ];
  const shellLayoutStorageId = `home-workbench-shell-v3-${
    isDesktopLayout ? 'desktop' : 'mobile'
  }`;
  const {
    defaultLayout: shellDefaultLayout,
    onLayoutChanged: onShellLayoutChanged,
  } = useDefaultLayout({
    id: shellLayoutStorageId,
    panelIds: shellPanelIds,
  });

  const workbench = (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-sm">
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
          <div className="h-full w-full bg-background/70 px-2 pt-4">
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

  const closedSideSize = isDesktopLayout ? '4%' : '8%';
  const openParametersSize = isDesktopLayout ? '18%' : '24%';
  const openModelsSize = isDesktopLayout ? '18%' : '22%';

  return (
    <div className={cn('h-full w-full bg-[#101113] p-3', className)}>
      <ResizablePanelGroup
        key={shellLayoutStorageId}
        id={shellLayoutStorageId}
        orientation={isDesktopLayout ? 'horizontal' : 'vertical'}
        defaultLayout={shellDefaultLayout}
        onLayoutChanged={onShellLayoutChanged}
        className="h-full w-full gap-3"
      >
        <ResizablePanel
          id="parameters-panel"
          defaultSize={
            isParametersPaneOpen ? openParametersSize : closedSideSize
          }
          minSize={
            isParametersPaneOpen
              ? isDesktopLayout
                ? '14%'
                : '18%'
              : closedSideSize
          }
          maxSize={
            isParametersPaneOpen
              ? isDesktopLayout
                ? '34%'
                : '40%'
              : closedSideSize
          }
          className="min-h-0 min-w-0"
        >
          {isParametersPaneOpen && parametersPane ? (
            parametersPane
          ) : (
            <PaneRail
              label="Parameters"
              side="left"
              onOpen={onOpenParametersPane}
              icon={<SlidersHorizontal className="size-5" />}
            />
          )}
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="rounded-full bg-transparent transition-colors after:w-2 hover:bg-border/30"
        />
        <ResizablePanel
          id="main-workbench-panel"
          defaultSize={`${
            100 - (isParametersPaneOpen ? 18 : 4) - (isModelsPaneOpen ? 18 : 4)
          }%`}
          minSize={isDesktopLayout ? '40%' : '35%'}
          className="min-h-0 min-w-0"
        >
          {workbench}
        </ResizablePanel>
        <ResizableHandle
          withHandle
          className="rounded-full bg-transparent transition-colors after:w-2 hover:bg-border/30"
        />
        <ResizablePanel
          id="models-panel"
          defaultSize={isModelsPaneOpen ? openModelsSize : closedSideSize}
          minSize={
            isModelsPaneOpen
              ? isDesktopLayout
                ? '14%'
                : '16%'
              : closedSideSize
          }
          maxSize={
            isModelsPaneOpen
              ? isDesktopLayout
                ? '34%'
                : '35%'
              : closedSideSize
          }
          className="min-h-0 min-w-0"
        >
          {isModelsPaneOpen && modelsPane ? (
            modelsPane
          ) : (
            <PaneRail
              label="Models"
              side="right"
              onOpen={onOpenModelsPane}
              icon={<Boxes className="size-5" />}
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
