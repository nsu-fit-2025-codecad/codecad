import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getMvpDemoNestingPreset,
  MVP_DEMO_NESTING_PRESET_IDS,
  MVP_DEMO_SCENES,
  type MvpDemoNestingPresetId,
  type MvpDemoSceneId,
} from '@/lib/demo/mvp-demo';
import { X } from 'lucide-react';

interface MvpDemoPanelProps {
  activeSceneId: MvpDemoSceneId | null;
  onClose: () => void;
  onLoadScene: (sceneId: MvpDemoSceneId) => void;
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
  onPrepareNestingPreset,
  className,
}: MvpDemoPanelProps) => (
  <Card className={cn('overflow-hidden', className)}>
    <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
      <CardTitle className="text-base">MVP</CardTitle>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="cursor-pointer"
        aria-label="Close MVP panel"
      >
        <X />
      </Button>
    </CardHeader>
    <CardContent className="space-y-2">
      {MVP_DEMO_SCENES.map((scene) => {
        const isActive = scene.id === activeSceneId;
        const canUsePresets = scene.kind === 'nesting' && isActive;

        return (
          <div
            key={scene.id}
            className={cn(
              'rounded-lg border p-2',
              isActive
                ? 'border-border bg-accent/60'
                : 'border-border/60 bg-background'
            )}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{scene.title}</span>
                <Button
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => onLoadScene(scene.id)}
                >
                  Load
                </Button>
              </div>

              {scene.kind === 'nesting' && (
                <div className="flex flex-wrap gap-1.5">
                  {MVP_DEMO_NESTING_PRESET_IDS.map((presetId) => {
                    const preset = getMvpDemoNestingPreset(presetId);

                    return (
                      <Button
                        key={presetId}
                        size="sm"
                        variant="outline"
                        className="h-7 cursor-pointer px-2 text-xs"
                        disabled={!canUsePresets}
                        onClick={() =>
                          onPrepareNestingPreset(scene.id, presetId)
                        }
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
    </CardContent>
  </Card>
);
