import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NestingGeneticSettingsProps {
  useGeneticSearch: boolean;
  populationSizeValue: string;
  maxGenerationsValue: string;
  mutationRateValue: string;
  crossoverRateValue: string;
  eliteCountValue: string;
  isNesting: boolean;
  onUseGeneticSearchChange: (checked: boolean) => void;
  onPopulationSizeChange: (value: string) => void;
  onMaxGenerationsChange: (value: string) => void;
  onMutationRateChange: (value: string) => void;
  onCrossoverRateChange: (value: string) => void;
  onEliteCountChange: (value: string) => void;
}

export const NestingGeneticSettings = ({
  useGeneticSearch,
  populationSizeValue,
  maxGenerationsValue,
  mutationRateValue,
  crossoverRateValue,
  eliteCountValue,
  isNesting,
  onUseGeneticSearchChange,
  onPopulationSizeChange,
  onMaxGenerationsChange,
  onMutationRateChange,
  onCrossoverRateChange,
  onEliteCountChange,
}: NestingGeneticSettingsProps) => (
  <div className="space-y-3 rounded-md border border-border/70 bg-background/70 p-3">
    <div className="flex items-center justify-between gap-3">
      <Label
        htmlFor="nesting-use-ga"
        className="cursor-pointer text-sm font-medium"
      >
        Use genetic algorithm
      </Label>
      <Checkbox
        id="nesting-use-ga"
        checked={useGeneticSearch}
        onCheckedChange={(checked) =>
          onUseGeneticSearchChange(checked === true)
        }
        disabled={isNesting}
      />
    </div>
    <p className="text-xs text-muted-foreground">Slower, often better fit.</p>
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
          onChange={(event) => onPopulationSizeChange(event.target.value)}
          disabled={!useGeneticSearch || isNesting}
        />
        <p className="text-xs text-muted-foreground">
          Number of candidate layouts evaluated per generation. Larger values
          can improve quality but increase runtime.
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
          onChange={(event) => onMaxGenerationsChange(event.target.value)}
          disabled={!useGeneticSearch || isNesting}
        />
        <p className="text-xs text-muted-foreground">
          Number of evolution rounds to run before stopping.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nesting-mutation-rate" className="text-xs font-medium">
          Mutation rate
        </Label>
        <Input
          id="nesting-mutation-rate"
          type="number"
          min={0}
          max={1}
          step="0.01"
          value={mutationRateValue}
          onChange={(event) => onMutationRateChange(event.target.value)}
          disabled={!useGeneticSearch || isNesting}
        />
        <p className="text-xs text-muted-foreground">
          Probability of random variation applied to offspring.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nesting-crossover-rate" className="text-xs font-medium">
          Crossover rate
        </Label>
        <Input
          id="nesting-crossover-rate"
          type="number"
          min={0}
          max={1}
          step="0.01"
          value={crossoverRateValue}
          onChange={(event) => onCrossoverRateChange(event.target.value)}
          disabled={!useGeneticSearch || isNesting}
        />
        <p className="text-xs text-muted-foreground">
          Probability of combining two parent layouts into a new candidate.
        </p>
      </div>
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="nesting-elite-count" className="text-xs font-medium">
        Elite count
      </Label>
      <Input
        id="nesting-elite-count"
        type="number"
        min={1}
        max={200}
        step="1"
        value={eliteCountValue}
        onChange={(event) => onEliteCountChange(event.target.value)}
        disabled={!useGeneticSearch || isNesting}
      />
      <p className="text-xs text-muted-foreground">
        Number of top layouts copied unchanged to the next generation.
      </p>
    </div>
  </div>
);
