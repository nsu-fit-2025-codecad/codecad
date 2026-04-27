import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NestingGeneticSettings } from '@/components/nesting-genetic-settings';
import { NestingRotationControl } from '@/components/nesting-rotation-control';
import type { NestingEngine } from '@/lib/nesting';

interface NestingSettingsFormProps {
  nestingEngine: NestingEngine;
  rotationCount: number;
  gapValue: string;
  curveToleranceValue: string;
  useGeneticSearch: boolean;
  populationSizeValue: string;
  maxGenerationsValue: string;
  mutationRateValue: string;
  crossoverRateValue: string;
  eliteCountValue: string;
  isNesting: boolean;
  onNestingEngineChange: (engine: NestingEngine) => void;
  onRotationCountChange: (rotationCount: number) => void;
  onGapChange: (value: string) => void;
  onCurveToleranceChange: (value: string) => void;
  onUseGeneticSearchChange: (checked: boolean) => void;
  onPopulationSizeChange: (value: string) => void;
  onMaxGenerationsChange: (value: string) => void;
  onMutationRateChange: (value: string) => void;
  onCrossoverRateChange: (value: string) => void;
  onEliteCountChange: (value: string) => void;
}

export const NestingSettingsForm = ({
  nestingEngine,
  rotationCount,
  gapValue,
  curveToleranceValue,
  useGeneticSearch,
  populationSizeValue,
  maxGenerationsValue,
  mutationRateValue,
  crossoverRateValue,
  eliteCountValue,
  isNesting,
  onNestingEngineChange,
  onRotationCountChange,
  onGapChange,
  onCurveToleranceChange,
  onUseGeneticSearchChange,
  onPopulationSizeChange,
  onMaxGenerationsChange,
  onMutationRateChange,
  onCrossoverRateChange,
  onEliteCountChange,
}: NestingSettingsFormProps) => (
  <div className="flex min-h-[18rem] flex-col rounded-md border border-border/70 bg-muted/10 md:min-h-0">
    <div className="border-b border-border/70 px-3 py-2.5">
      <h3 className="text-base leading-none font-semibold">Nesting Settings</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Applied to this nesting run.
      </p>
    </div>
    <ScrollArea className="max-h-[60vh] md:min-h-0 md:flex-1">
      <div className="space-y-4 p-3">
        <div className="space-y-1.5">
          <Label htmlFor="nesting-engine" className="text-sm font-medium">
            Engine
          </Label>
          <Select
            value={nestingEngine}
            onValueChange={(value) =>
              onNestingEngineChange(value as NestingEngine)
            }
            disabled={isNesting}
          >
            <SelectTrigger id="nesting-engine">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">TypeScript stable</SelectItem>
              <SelectItem value="rust-wasm">Rust/WASM experimental</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <NestingRotationControl
          rotationCount={rotationCount}
          isNesting={isNesting}
          onChange={onRotationCountChange}
        />
        <div className="space-y-1.5">
          <Label htmlFor="nesting-gap" className="text-sm font-medium">
            Part spacing (gap)
          </Label>
          <Input
            id="nesting-gap"
            type="number"
            min={0}
            step="0.1"
            value={gapValue}
            onChange={(event) => onGapChange(event.target.value)}
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
            onChange={(event) => onCurveToleranceChange(event.target.value)}
            disabled={isNesting}
          />
          <p className="text-xs text-muted-foreground">
            Lower values follow curves more closely but can run slower.
          </p>
        </div>
        <NestingGeneticSettings
          useGeneticSearch={useGeneticSearch}
          populationSizeValue={populationSizeValue}
          maxGenerationsValue={maxGenerationsValue}
          mutationRateValue={mutationRateValue}
          crossoverRateValue={crossoverRateValue}
          eliteCountValue={eliteCountValue}
          isNesting={isNesting}
          onUseGeneticSearchChange={onUseGeneticSearchChange}
          onPopulationSizeChange={onPopulationSizeChange}
          onMaxGenerationsChange={onMaxGenerationsChange}
          onMutationRateChange={onMutationRateChange}
          onCrossoverRateChange={onCrossoverRateChange}
          onEliteCountChange={onEliteCountChange}
        />
      </div>
    </ScrollArea>
  </div>
);
