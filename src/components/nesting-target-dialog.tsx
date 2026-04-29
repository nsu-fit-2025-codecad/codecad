import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NestingSettingsForm } from '@/components/nesting-settings-form';
import {
  NestingTargetList,
  type NestingTargetOption,
} from '@/components/nesting-target-list';
import {
  normalizeRotationCount,
  resolveRotationSelection,
  rotationCountToAngles,
} from '@/lib/nesting/polygon/rotations';
import { MAX_WASM_ATTEMPTS } from '@/lib/nesting/orchestration/options';
import type {
  NestingEngine,
  PackingOptions,
  WasmSearchMode,
} from '@/lib/nesting';

const resolveRotationFromOptions = (options: PackingOptions | undefined) =>
  resolveRotationSelection({
    rotationCount: options?.rotationCount,
    rotations: options?.rotations,
    allowRotation: options?.allowRotation ?? true,
  });

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
  const initialRotationSelection = resolveRotationFromOptions(initialOptions);
  const [selectedTargetModelId, setSelectedTargetModelId] = useState<
    string | null
  >(initialTargetModelId);
  const [nestingEngine, setNestingEngine] = useState<NestingEngine>(
    initialOptions?.nestingEngine ?? 'typescript'
  );
  const [gapValue, setGapValue] = useState(String(initialOptions?.gap ?? 0));
  const [rotationCount, setRotationCount] = useState(
    initialRotationSelection.displayRotationCount
  );
  const [legacyRotations, setLegacyRotations] = useState<number[] | null>(
    initialRotationSelection.rotationCount === null
      ? initialRotationSelection.rotations
      : null
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
  const [wasmSearchMode, setWasmSearchMode] = useState<WasmSearchMode>(
    initialOptions?.wasmSearchMode ?? 'best-of-n'
  );
  const [wasmAttemptsValue, setWasmAttemptsValue] = useState(
    String(initialOptions?.wasmAttempts ?? 8)
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const hasInitialTarget =
      initialTargetModelId !== null &&
      models.some((model) => model.id === initialTargetModelId);

    setSelectedTargetModelId(hasInitialTarget ? initialTargetModelId : null);
    setNestingEngine(initialOptions?.nestingEngine ?? 'typescript');
    setGapValue(String(initialOptions?.gap ?? 0));
    const resolvedRotationSelection =
      resolveRotationFromOptions(initialOptions);
    setRotationCount(resolvedRotationSelection.displayRotationCount);
    setLegacyRotations(
      resolvedRotationSelection.rotationCount === null
        ? resolvedRotationSelection.rotations
        : null
    );
    setCurveToleranceValue(String(initialOptions?.curveTolerance ?? 1));
    setUseGeneticSearch(initialOptions?.useGeneticSearch ?? true);
    setPopulationSizeValue(String(initialOptions?.populationSize ?? 8));
    setMaxGenerationsValue(String(initialOptions?.maxGenerations ?? 2));
    setMutationRateValue(String(initialOptions?.mutationRate ?? 0.2));
    setCrossoverRateValue(String(initialOptions?.crossoverRate ?? 0.85));
    setEliteCountValue(String(initialOptions?.eliteCount ?? 2));
    setWasmSearchMode(initialOptions?.wasmSearchMode ?? 'best-of-n');
    setWasmAttemptsValue(String(initialOptions?.wasmAttempts ?? 8));
  }, [initialOptions, initialTargetModelId, models, open]);

  const handleConfirm = () => {
    if (!selectedTargetModelId) {
      return;
    }

    const parsedGap = Number(gapValue);
    const normalizedGap =
      Number.isFinite(parsedGap) && parsedGap >= 0 ? parsedGap : 0;
    const normalizedRotationCount = normalizeRotationCount(rotationCount, 1);
    const rotations =
      legacyRotations ?? rotationCountToAngles(normalizedRotationCount);
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
    const normalizedWasmAttempts = Math.round(
      parseAndClamp(wasmAttemptsValue, 8, 1, MAX_WASM_ATTEMPTS)
    );

    onConfirm(selectedTargetModelId, {
      nestingEngine,
      allowRotation: rotations.length > 1,
      rotationCount:
        legacyRotations === null ? normalizedRotationCount : undefined,
      rotations,
      gap: normalizedGap,
      curveTolerance: normalizedCurveTolerance,
      useGeneticSearch,
      populationSize: normalizedPopulationSize,
      maxGenerations: normalizedMaxGenerations,
      mutationRate: normalizedMutationRate,
      crossoverRate: normalizedCrossoverRate,
      eliteCount: normalizedEliteCount,
      wasmSearchMode,
      wasmAttempts: normalizedWasmAttempts,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-h-[85vh] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nesting</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 md:overflow-hidden md:pr-0">
          <div className="grid min-h-full gap-4 md:h-full md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <NestingTargetList
              models={models}
              selectedTargetModelId={selectedTargetModelId}
              onSelect={setSelectedTargetModelId}
            />
            <NestingSettingsForm
              nestingEngine={nestingEngine}
              rotationCount={rotationCount}
              gapValue={gapValue}
              curveToleranceValue={curveToleranceValue}
              useGeneticSearch={useGeneticSearch}
              populationSizeValue={populationSizeValue}
              maxGenerationsValue={maxGenerationsValue}
              mutationRateValue={mutationRateValue}
              crossoverRateValue={crossoverRateValue}
              eliteCountValue={eliteCountValue}
              wasmSearchMode={wasmSearchMode}
              wasmAttemptsValue={wasmAttemptsValue}
              isNesting={isNesting}
              onNestingEngineChange={setNestingEngine}
              onRotationCountChange={(value) => {
                setLegacyRotations(null);
                setRotationCount(value);
              }}
              onGapChange={setGapValue}
              onCurveToleranceChange={setCurveToleranceValue}
              onUseGeneticSearchChange={setUseGeneticSearch}
              onPopulationSizeChange={setPopulationSizeValue}
              onMaxGenerationsChange={setMaxGenerationsValue}
              onMutationRateChange={setMutationRateValue}
              onCrossoverRateChange={setCrossoverRateValue}
              onEliteCountChange={setEliteCountValue}
              onWasmSearchModeChange={setWasmSearchMode}
              onWasmAttemptsChange={setWasmAttemptsValue}
            />
          </div>
        </div>
        <DialogFooter className="mt-2 shrink-0 border-t border-border/70 pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
