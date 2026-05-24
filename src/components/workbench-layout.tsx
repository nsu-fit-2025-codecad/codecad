import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { CodeEditor } from '@/components/code-editor';
import { VisualizationArea } from '@/components/visualization-area';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import {
  type PanelImperativeHandle,
  useDefaultLayout,
} from 'react-resizable-panels';

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
  onOpen: () => void;
  icon: ReactNode;
}

const PaneRail = ({ label, onOpen, icon }: PaneRailProps) => (
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
      {icon}
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
  const parametersPanelRef = useRef<PanelImperativeHandle | null>(null);
  const modelsPanelRef = useRef<PanelImperativeHandle | null>(null);
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
        <ResizableHandle className="bg-border/80 transition-colors hover:bg-border" />
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
  const closedSidePercent = isDesktopLayout ? 4 : 8;
  const openParametersSize = isDesktopLayout ? '18%' : '24%';
  const openModelsSize = isDesktopLayout ? '18%' : '22%';
  const parametersMaxSize = isDesktopLayout ? '34%' : '40%';
  const modelsMaxSize = isDesktopLayout ? '34%' : '35%';

  useEffect(() => {
    const panel = parametersPanelRef.current;

    if (!panel) {
      return;
    }

    if (isParametersPaneOpen) {
      panel.expand();
      const timeoutId = window.setTimeout(() => {
        if (panel.getSize().asPercentage <= closedSidePercent + 0.25) {
          panel.resize(openParametersSize);
        }
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    panel.collapse();
    const timeoutId = window.setTimeout(() => {
      panel.resize(closedSideSize);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    closedSidePercent,
    closedSideSize,
    isParametersPaneOpen,
    openParametersSize,
  ]);

  useEffect(() => {
    const panel = modelsPanelRef.current;

    if (!panel) {
      return;
    }

    if (isModelsPaneOpen) {
      panel.expand();
      const timeoutId = window.setTimeout(() => {
        if (panel.getSize().asPercentage <= closedSidePercent + 0.25) {
          panel.resize(openModelsSize);
        }
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    panel.collapse();
    const timeoutId = window.setTimeout(() => {
      panel.resize(closedSideSize);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [closedSidePercent, closedSideSize, isModelsPaneOpen, openModelsSize]);

  return (
    <div className={cn('h-full w-full bg-[#101113] p-3', className)}>
      <ResizablePanelGroup
        key={shellLayoutStorageId}
        id={shellLayoutStorageId}
        orientation={isDesktopLayout ? 'horizontal' : 'vertical'}
        defaultLayout={shellDefaultLayout}
        onLayoutChanged={onShellLayoutChanged}
        className="h-full w-full gap-1.5"
      >
        <ResizablePanel
          id="parameters-panel"
          panelRef={parametersPanelRef}
          defaultSize={
            isParametersPaneOpen ? openParametersSize : closedSideSize
          }
          minSize={closedSideSize}
          maxSize={parametersMaxSize}
          collapsible
          collapsedSize={closedSideSize}
          className="min-h-0 min-w-0"
        >
          {isParametersPaneOpen && parametersPane ? (
            parametersPane
          ) : (
            <PaneRail
              label="Parameters"
              onOpen={onOpenParametersPane}
              icon={<PanelLeftOpen className="size-5" />}
            />
          )}
        </ResizablePanel>
        <ResizableHandle
          disabled={!isParametersPaneOpen}
          className={cn(
            'rounded-full bg-transparent transition-colors after:w-2 hover:bg-border/30',
            !isParametersPaneOpen && 'pointer-events-none opacity-0'
          )}
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
          disabled={!isModelsPaneOpen}
          className={cn(
            'rounded-full bg-transparent transition-colors after:w-2 hover:bg-border/30',
            !isModelsPaneOpen && 'pointer-events-none opacity-0'
          )}
        />
        <ResizablePanel
          id="models-panel"
          panelRef={modelsPanelRef}
          defaultSize={isModelsPaneOpen ? openModelsSize : closedSideSize}
          minSize={closedSideSize}
          maxSize={modelsMaxSize}
          collapsible
          collapsedSize={closedSideSize}
          className="min-h-0 min-w-0"
        >
          {isModelsPaneOpen && modelsPane ? (
            modelsPane
          ) : (
            <PaneRail
              label="Models"
              onOpen={onOpenModelsPane}
              icon={<PanelRightOpen className="size-5" />}
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
