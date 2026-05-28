import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Model } from '@/store/models-store';

interface ModelHoverCardProps {
  model: Model;
  anchor: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

export const ModelHoverCard = ({
  model,
  anchor,
  containerRef,
}: ModelHoverCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!cardRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();
    const padding = 12;

    let top = anchor.y + padding;
    let left = anchor.x + padding;

    if (top + cardRect.height > containerRect.bottom) {
      top = anchor.y - cardRect.height - padding;
    }
    if (left + cardRect.width > containerRect.right) {
      left = anchor.x - cardRect.width - padding;
    }

    setPosition({
      top: top - containerRect.top,
      left: left - containerRect.left,
    });
  }, [anchor, containerRef]);

  const fitStatus =
    model.fit === true ? 'Packed' : model.fit === false ? 'Not fit' : null;

  return (
    <div
      ref={cardRef}
      className="absolute z-20 pointer-events-none"
      style={{ top: position.top, left: position.left }}
    >
      <Card className="pointer-events-auto max-w-[280px] shadow-lg border-border/80">
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium truncate" title={model.id}>
              {model.id}
            </span>
            {fitStatus && (
              <span
                className={cn(
                  'text-xs font-medium',
                  model.fit === true && 'text-green-600',
                  model.fit === false && 'text-red-600'
                )}
              >
                {fitStatus}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatNumber(model.width)} x {formatNumber(model.height)}
            {model.diagnostics?.bounds && (
              <>
                {' · Area '}
                {formatNumber(model.diagnostics.bounds.area)}
              </>
            )}
          </div>
          {/* ← Исправленная проверка: безопасный доступ к warnings */}
          {model.diagnostics?.warnings &&
            model.diagnostics.warnings.length > 0 && (
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {model.diagnostics.warnings.map((warning, i) => (
                  <div key={i} className="text-amber-600">
                    {warning}
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};
