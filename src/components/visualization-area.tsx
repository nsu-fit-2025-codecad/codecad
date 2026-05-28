import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { usePanZoom } from '@/hooks/usePanZoom';
import { highlightSelectedModelInSvg } from '@/lib/svg-highlight';
import { useModelsStore } from '@/store/models-store';
import { ModelHoverCard } from '@/components/model-hover-card';

const HOVER_DELAY_MS = 150;
const HOVER_STROKE_COLOR = '#f59e0b';
const HOVER_STROKE_WIDTH = '0.6mm';

interface VisualizationAreaProps {
  svgString: string;
  selectedModelId: string | null;
  isRendering?: boolean;
}

export const VisualizationArea = ({
  svgString,
  selectedModelId,
  isRendering = false,
}: VisualizationAreaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    hoveredModelId,
    setHoveredModelId,
    models: allModels,
  } = useModelsStore();
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlightedSvg = useMemo(
    () => highlightSelectedModelInSvg(svgString, selectedModelId),
    [selectedModelId, svgString]
  );

  const {
    getContainerStyle,
    getSvgStyle,
    startPan,
    pan,
    endPan,
    handleWheel,
    resetTransform,
    transform,
  } = usePanZoom();

  const findModelIdFromTarget = useCallback(
    (target: Element): string | null => {
      const directId = target.getAttribute('id');
      if (directId && allModels?.some((m) => m.id === directId))
        return directId;

      const closestGroup = target.closest('g[id]');
      if (closestGroup) {
        const groupId = closestGroup.getAttribute('id');
        if (groupId && allModels?.some((m) => m.id === groupId)) return groupId;
      }
      return null;
    },
    [allModels]
  );

  const clearHover = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredModelId(null);
    setCursorPos(null);
  }, [setHoveredModelId, setCursorPos]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      pan(e);

      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || !(target instanceof Element)) {
        clearHover();
        return;
      }

      if (!containerRef.current?.contains(target)) {
        clearHover();
        return;
      }

      const modelId = findModelIdFromTarget(target);
      if (modelId) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
          setHoveredModelId(modelId);
          setCursorPos({ x: e.clientX, y: e.clientY });
        }, HOVER_DELAY_MS);
      } else {
        clearHover();
      }
    },
    [pan, findModelIdFromTarget, clearHover, setHoveredModelId, setCursorPos]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) startPan(e);
    },
    [startPan]
  );

  const handleDoubleClick = useCallback(() => {
    resetTransform();
  }, [resetTransform]);

  const handleMouseLeave = useCallback(() => {
    endPan();
    clearHover();
  }, [endPan, clearHover]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;

    svg.querySelectorAll('[data-hover-highlight="true"]').forEach((el) => {
      el.removeAttribute('data-hover-highlight');
      el.querySelectorAll('path').forEach((p) => {
        p.style.stroke = '';
        p.style.strokeWidth = '';
      });
    });

    if (hoveredModelId && hoveredModelId !== selectedModelId) {
      const targetGroup = svg.querySelector(`g[id="${hoveredModelId}"]`);
      if (targetGroup) {
        targetGroup.setAttribute('data-hover-highlight', 'true');
        targetGroup.querySelectorAll('path').forEach((p) => {
          p.style.stroke = HOVER_STROKE_COLOR;
          p.style.strokeWidth = HOVER_STROKE_WIDTH;
        });
      }
    }
  }, [hoveredModelId, selectedModelId]);

  return (
    <div className="relative h-full w-full bg-background">
      <div
        ref={containerRef}
        className="relative h-full w-full"
        style={getContainerStyle()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endPan}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div
          dangerouslySetInnerHTML={{ __html: highlightedSvg }}
          style={{ ...getSvgStyle(), pointerEvents: 'auto' }}
          className="select-none"
        />

        {hoveredModelId && cursorPos && (
          <ModelHoverCard
            model={allModels.find((m) => m.id === hoveredModelId)!}
            anchor={cursorPos}
            containerRef={containerRef}
          />
        )}
      </div>

      <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded border bg-card/90 px-2 py-1 text-xs text-card-foreground shadow-sm backdrop-blur">
        X: {Math.round(transform.x)} Y: {Math.round(transform.y)} Zoom:{' '}
        {Math.round(transform.scale * 100)}%
      </div>
      {isRendering && (
        <div className="absolute right-3 bottom-3 z-10 rounded border bg-card/90 px-2 py-1 text-xs text-card-foreground shadow-sm backdrop-blur">
          Rendering...
        </div>
      )}
    </div>
  );
};
