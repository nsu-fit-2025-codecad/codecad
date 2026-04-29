import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MAX_WASM_ATTEMPTS } from '@/lib/nesting/orchestration/options';
import type { WasmSearchMode } from '@/lib/nesting';

interface NestingWasmSettingsProps {
  wasmSearchMode: WasmSearchMode;
  wasmAttemptsValue: string;
  isNesting: boolean;
  onWasmSearchModeChange: (mode: WasmSearchMode) => void;
  onWasmAttemptsChange: (value: string) => void;
}

export const NestingWasmSettings = ({
  wasmSearchMode,
  wasmAttemptsValue,
  isNesting,
  onWasmSearchModeChange,
  onWasmAttemptsChange,
}: NestingWasmSettingsProps) => (
  <div className="space-y-3 rounded-md border border-border/70 bg-background/70 p-3">
    <div className="space-y-1.5">
      <Label htmlFor="nesting-wasm-strategy" className="text-sm font-medium">
        WASM strategy
      </Label>
      <Select
        value={wasmSearchMode}
        onValueChange={(value) =>
          onWasmSearchModeChange(value as WasmSearchMode)
        }
        disabled={isNesting}
      >
        <SelectTrigger id="nesting-wasm-strategy">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="best-of-n">Best of N</SelectItem>
          <SelectItem value="single">Single run</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="nesting-wasm-attempts" className="text-xs font-medium">
        Attempts
      </Label>
      <Input
        id="nesting-wasm-attempts"
        type="number"
        min={1}
        max={MAX_WASM_ATTEMPTS}
        step="1"
        value={wasmAttemptsValue}
        onChange={(event) => onWasmAttemptsChange(event.target.value)}
        disabled={wasmSearchMode !== 'best-of-n' || isNesting}
      />
      <p className="text-xs text-muted-foreground">
        Runs SVGnest several times and keeps the best valid layout.
      </p>
    </div>
  </div>
);
