import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PackingOptions } from '@/lib/nesting';

type RotationPreset = 'none' | 'orthogonal' | 'quarter-turns';

interface NestingTargetOption {
  id: string;
  width?: number;
  height?: number;
}

const rotationPresetFromOptions = (
  options: PackingOptions | undefined
): RotationPreset => {
  const rotations = Array.isArray(options?.rotations)
    ? [
        ...new Set(
          options.rotations.map((rotation) => ((rotation % 360) + 360) % 360)
        ),
      ]
    : null;

  if (rotations && rotations.length > 0) {
    const normalized = rotations.sort((left, right) => left - right).join(',');

    if (normalized === '0') {
      return 'none';
    }

    if (normalized === '0,90') {
      return 'orthogonal';
    }

    if (normalized === '0,90,180,270') {
      return 'quarter-turns';
    }
  }

  return (options?.allowRotation ?? true) ? 'orthogonal' : 'none';
};

const parseAndClamp = (
  value: string,
  fallback: number,
  min: number,
  max?: number
) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (max === undefined) {
    return Math.max(min, parsed);
  }

  return Math.min(max, Math.max(min, parsed));
};

const formatDimension = (value: number | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return Number(value.toFixed(2)).toString();
};

interface NestingTargetDialogProps {
  open: boolean;
  models: NestingTargetOption[];
  initialTargetModelId?: string | null;
  initialOptions?: PackingOptions;
  isNesting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetModelId: string, options: PackingOptions) => void;
}

export const NestingTargetDialog = ({
  open,
  models,
  initialTargetModelId = null,
  initialOptions,
  isNesting = false,
  onOpenChange,
  onConfirm,
}: NestingTargetDialogProps) => {
  const [selectedTargetModelId, setSelectedTargetModelId] = useState<
    string | null
  >(initialTargetModelId);
  const [gapValue, setGapValue] = useState(String(initialOptions?.gap ?? 0));
  const [rotationPreset, setRotationPreset] = useState<RotationPreset>(
    rotationPresetFromOptions(initialOptions)
  );
  const [curveToleranceValue, setCurveToleranceValue] = useState(
    String(initialOptions?.curveTolerance ?? 1)
  );
  const [useGeneticSearch, setUseGeneticSearch] = useState(
    initialOptions?.useGeneticSearch ?? true
  );
  const [populationSizeValue, setPopulationSizeValue] = useState(
    String(initialOptions?.populationSize ?? 8)
  );
  const [maxGenerationsValue, setMaxGenerationsValue] = useState(
    String(initialOptions?.maxGenerations ?? 2)
  );
  const [mutationRateValue, setMutationRateValue] = useState(
    String(initialOptions?.mutationRate ?? 0.2)
  );
  const [crossoverRateValue, setCrossoverRateValue] = useState(
    String(initialOptions?.crossoverRate ?? 0.85)
  );
  const [eliteCountValue, setEliteCountValue] = useState(
    String(initialOptions?.eliteCount ?? 2)
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const hasInitialTarget =
      initialTargetModelId !== null &&
      models.some((model) => model.id === initialTargetModelId);

    setSelectedTargetModelId(hasInitialTarget ? initialTargetModelId : null);
    setGapValue(String(initialOptions?.gap ?? 0));
    setRotationPreset(rotationPresetFromOptions(initialOptions));
    setCurveToleranceValue(String(initialOptions?.curveTolerance ?? 1));
    setUseGeneticSearch(initialOptions?.useGeneticSearch ?? true);
    setPopulationSizeValue(String(initialOptions?.populationSize ?? 8));
    setMaxGenerationsValue(String(initialOptions?.maxGenerations ?? 2));
    setMutationRateValue(String(initialOptions?.mutationRate ?? 0.2));
    setCrossoverRateValue(String(initialOptions?.crossoverRate ?? 0.85));
    setEliteCountValue(String(initialOptions?.eliteCount ?? 2));
  }, [initialOptions, initialTargetModelId, models, open]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  const handleConfirm = () => {
    if (!selectedTargetModelId) {
      return;
    }

    const parsedGap = Number(gapValue);
    const normalizedGap =
      Number.isFinite(parsedGap) && parsedGap >= 0 ? parsedGap : 0;
    const rotations =
      rotationPreset === 'none'
        ? [0]
        : rotationPreset === 'quarter-turns'
          ? [0, 90, 180, 270]
          : [0, 90];
    const normalizedCurveTolerance = parseAndClamp(
      curveToleranceValue,
      1,
      1e-6
    );
    const normalizedPopulationSize = Math.round(
      parseAndClamp(populationSizeValue, 8, 2, 200)
    );
    const normalizedMaxGenerations = Math.round(
      parseAndClamp(maxGenerationsValue, 2, 1, 500)
    );
    const normalizedMutationRate = parseAndClamp(mutationRateValue, 0.2, 0, 1);
    const normalizedCrossoverRate = parseAndClamp(
      crossoverRateValue,
      0.85,
      0,
      1
    );
    const normalizedEliteCount = Math.round(
      parseAndClamp(
        eliteCountValue,
        2,
        1,
        Math.max(1, normalizedPopulationSize)
      )
    );

    onConfirm(selectedTargetModelId, {
      allowRotation: rotations.length > 1,
      rotations,
      gap: normalizedGap,
      curveTolerance: normalizedCurveTolerance,
      useGeneticSearch,
      populationSize: normalizedPopulationSize,
      maxGenerations: normalizedMaxGenerations,
      mutationRate: normalizedMutationRate,
      crossoverRate: normalizedCrossoverRate,
      eliteCount: normalizedEliteCount,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-h-[85vh] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nesting</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 md:overflow-hidden md:pr-0">
          <div className="grid min-h-full gap-4 md:h-full md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="flex min-h-[14rem] flex-col rounded-md border border-border/70 bg-muted/10 md:min-h-0">
              <div className="border-b border-border/70 px-3 py-2.5">
                <h3 className="text-base leading-none font-semibold">Target</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Choose the shape that parts will be placed into.
                </p>
              </div>
              <ScrollArea className="max-h-[60vh] md:min-h-0 md:flex-1">
                <ItemGroup className="gap-2 p-3">
                  {models.map((model) => {
                    const isSelected = selectedTargetModelId === model.id;

                    return (
                      <Item
                        key={model.id}
                        onClick={() => setSelectedTargetModelId(model.id)}
                        className={cn(
                          'cursor-pointer px-3 py-2 border border-border/50 bg-background transition-[background-color,border-color,box-shadow] duration-150',
                          isSelected && 'bg-accent border-border shadow-xs',
                          !isSelected &&
                            'hover:bg-accent/20 hover:border-border'
                        )}
                      >
                        <ItemHeader>
                          <ItemContent className="gap-0.5">
                            <ItemTitle>{model.id}</ItemTitle>
                            <p className="text-xs text-muted-foreground">
                              W: {formatDimension(model.width)}, H:{' '}
                              {formatDimension(model.height)}
                            </p>
                          </ItemContent>
                        </ItemHeader>
                      </Item>
                    );
                  })}
                </ItemGroup>
              </ScrollArea>
            </div>
            <div className="flex min-h-[18rem] flex-col rounded-md border border-border/70 bg-muted/10 md:min-h-0">
              <div className="border-b border-border/70 px-3 py-2.5">
                <h3 className="text-base leading-none font-semibold">
                  Nesting Settings
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Applied to this nesting run.
                </p>
              </div>
              <ScrollArea className="max-h-[60vh] md:min-h-0 md:flex-1">
                <div className="space-y-4 p-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="nesting-rotation-preset"
                      className="text-sm font-medium"
                    >
                      Allowed rotations
                    </Label>
                    <Select
                      value={rotationPreset}
                      onValueChange={(value) =>
                        setRotationPreset(value as RotationPreset)
                      }
                      disabled={isNesting}
                    >
                      <SelectTrigger id="nesting-rotation-preset">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No rotation</SelectItem>
                        <SelectItem value="orthogonal">90°</SelectItem>
                        <SelectItem value="quarter-turns">
                          90°, 180°, 270°
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="nesting-gap"
                      className="text-sm font-medium"
                    >
                      Part spacing (gap)
                    </Label>
                    <Input
                      id="nesting-gap"
                      type="number"
                      min={0}
                      step="0.1"
                      value={gapValue}
                      onChange={(event) => setGapValue(event.target.value)}
                      disabled={isNesting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum clearance between parts in model units.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="nesting-curve-tolerance"
                      className="text-sm font-medium"
                    >
                      Curve detail tolerance
                    </Label>
                    <Input
                      id="nesting-curve-tolerance"
                      type="number"
                      min={0.000001}
                      step="0.1"
                      value={curveToleranceValue}
                      onChange={(event) =>
                        setCurveToleranceValue(event.target.value)
                      }
                      disabled={isNesting}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower values follow curves more closely but can run
                      slower.
                    </p>
                  </div>
                  <div className="space-y-3 rounded-md border border-border/70 bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label
                        htmlFor="nesting-use-ga"
                        className="text-sm font-medium cursor-pointer"
                      >
                        Use genetic algorithm
                      </Label>
                      <Checkbox
                        id="nesting-use-ga"
                        checked={useGeneticSearch}
                        onCheckedChange={(checked) =>
                          setUseGeneticSearch(checked === true)
                        }
                        disabled={isNesting}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Slower, often better fit.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="nesting-population-size"
                          className="text-xs font-medium"
                        >
                          Population size
                        </Label>
                        <Input
                          id="nesting-population-size"
                          type="number"
                          min={2}
                          max={200}
                          step="1"
                          value={populationSizeValue}
                          onChange={(event) =>
                            setPopulationSizeValue(event.target.value)
                          }
                          disabled={!useGeneticSearch || isNesting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Number of candidate layouts evaluated per generation.
                          Larger values can improve quality but increase
                          runtime.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="nesting-max-generations"
                          className="text-xs font-medium"
                        >
                          Generations
                        </Label>
                        <Input
                          id="nesting-max-generations"
                          type="number"
                          min={1}
                          max={500}
                          step="1"
                          value={maxGenerationsValue}
                          onChange={(event) =>
                            setMaxGenerationsValue(event.target.value)
                          }
                          disabled={!useGeneticSearch || isNesting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Number of evolution rounds to run before stopping.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="nesting-mutation-rate"
                          className="text-xs font-medium"
                        >
                          Mutation rate
                        </Label>
                        <Input
                          id="nesting-mutation-rate"
                          type="number"
                          min={0}
                          max={1}
                          step="0.01"
                          value={mutationRateValue}
                          onChange={(event) =>
                            setMutationRateValue(event.target.value)
                          }
                          disabled={!useGeneticSearch || isNesting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Probability of random variation applied to offspring.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="nesting-crossover-rate"
                          className="text-xs font-medium"
                        >
                          Crossover rate
                        </Label>
                        <Input
                          id="nesting-crossover-rate"
                          type="number"
                          min={0}
                          max={1}
                          step="0.01"
                          value={crossoverRateValue}
                          onChange={(event) =>
                            setCrossoverRateValue(event.target.value)
                          }
                          disabled={!useGeneticSearch || isNesting}
                        />
                        <p className="text-xs text-muted-foreground">
                          Probability of combining two parent layouts into a new
                          candidate.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="nesting-elite-count"
                        className="text-xs font-medium"
                      >
                        Elite count
                      </Label>
                      <Input
                        id="nesting-elite-count"
                        type="number"
                        min={1}
                        max={200}
                        step="1"
                        value={eliteCountValue}
                        onChange={(event) =>
                          setEliteCountValue(event.target.value)
                        }
                        disabled={!useGeneticSearch || isNesting}
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of top layouts copied unchanged to the next
                        generation.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-2 shrink-0 border-t border-border/70 pt-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-25"
            disabled={isNesting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTargetModelId || isNesting}
            className="w-25"
          >
            {isNesting ? 'Running...' : 'Run Nesting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
