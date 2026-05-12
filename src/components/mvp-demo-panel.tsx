import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  getMvpDemoNestingPreset,
  type MvpDemoNestingPresetId,
  type MvpDemoSceneId,
} from '@/lib/demo/mvp-demo';
import { getCadExampleGroups } from '@/lib/content/registry';
import type { CadSnippetId } from '@/lib/cad/snippets';
import { Shapes, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface MvpDemoPanelProps {
  activeSceneId: MvpDemoSceneId | null;
  onClose: () => void;
  onLoadScene: (sceneId: MvpDemoSceneId) => void;
  onLoadSnippet: (snippetId: CadSnippetId) => void;
  onPrepareNestingPreset: (
    sceneId: MvpDemoSceneId,
    presetId: MvpDemoNestingPresetId
  ) => void;
  className?: string;
}

export const MvpDemoPanel = ({
  activeSceneId,
  onClose,
  onLoadScene,
  onLoadSnippet,
  onPrepareNestingPreset,
  className,
}: MvpDemoPanelProps) => {
  const [query, setQuery] = useState('');
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const groups = useMemo(() => getCadExampleGroups(query), [query]);
  const activeGroup =
    groups.find((group) => group.plugin.id === selectedPluginId) ??
    groups[0] ??
    null;

  return (
    <Card
      className={cn('flex flex-col overflow-hidden rounded-2xl', className)}
    >
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shapes className="size-4" />
            Examples
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="cursor-pointer"
            aria-label="Close examples panel"
          >
            <X />
          </Button>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search examples"
          aria-label="Search examples"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((group) => (
            <Button
              key={group.plugin.id}
              type="button"
              variant={
                activeGroup?.plugin.id === group.plugin.id
                  ? 'default'
                  : 'outline'
              }
              size="sm"
              className="shrink-0 cursor-pointer"
              onClick={() => setSelectedPluginId(group.plugin.id)}
            >
              {group.plugin.title}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-3">
            {!activeGroup && (
              <p className="rounded-md border border-border/70 p-3 text-sm text-muted-foreground">
                No examples match the current search.
              </p>
            )}
            {activeGroup && (
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {activeGroup.plugin.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeGroup.plugin.description}
                  </p>
                </div>
                <div className="space-y-2">
                  {activeGroup.examples.map((example) => {
                    const isActive = example.sceneId === activeSceneId;
                    const canUsePresets =
                      example.kind === 'nesting' &&
                      isActive &&
                      Boolean(example.sceneId);

                    return (
                      <div
                        key={example.id}
                        className={cn(
                          'rounded-lg border p-3',
                          isActive
                            ? 'border-border bg-accent/60'
                            : 'border-border/60 bg-background'
                        )}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {example.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {example.description}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant={isActive ? 'outline' : 'default'}
                              className="cursor-pointer"
                              onClick={() =>
                                example.sceneId
                                  ? onLoadScene(example.sceneId)
                                  : onLoadSnippet(example.snippetId)
                              }
                            >
                              Load
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {example.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {example.nestingPresetIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {example.nestingPresetIds.map((presetId) => {
                                const preset =
                                  getMvpDemoNestingPreset(presetId);

                                return (
                                  <Button
                                    key={presetId}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 cursor-pointer px-2 text-xs"
                                    disabled={!canUsePresets}
                                    onClick={() => {
                                      if (example.sceneId) {
                                        onPrepareNestingPreset(
                                          example.sceneId,
                                          presetId
                                        );
                                      }
                                    }}
                                  >
                                    {preset.title}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
