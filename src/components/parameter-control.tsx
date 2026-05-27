import React from 'react';
import { Field, FieldTitle } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import type { Parameter } from '@/store/store';
import { Minus, Pencil, Plus } from 'lucide-react';

type ParameterControlProps = {
  parameter: Parameter;
  updateValue: (name: string, value: number) => void;
  onBeforeCommit?: () => void;
  onCommit?: () => void;
  onEdit: (parameter: Parameter) => void;
};

export const ParameterControl = ({
  parameter,
  updateValue,
  onBeforeCommit,
  onCommit,
  onEdit,
}: ParameterControlProps) => {
  const [inputValue, setInputValue] = React.useState(String(parameter.value));
  const isSliderEditingRef = React.useRef(false);

  React.useEffect(() => {
    setInputValue(String(parameter.value));
  }, [parameter.value]);

  const min = parameter.min ?? -Infinity;
  const max = parameter.max ?? Infinity;
  const step = parameter.step ?? 1;
  const stepPrecision = getStepPrecision(step);
  const isAtMin = Number.isFinite(min) && parameter.value <= min;
  const isAtMax = Number.isFinite(max) && parameter.value >= max;

  const stepValue = (direction: -1 | 1) => {
    const nextValue = roundToPrecision(
      Math.min(max, Math.max(min, parameter.value + step * direction)),
      stepPrecision
    );

    if (nextValue === parameter.value) {
      return;
    }

    onBeforeCommit?.();
    updateValue(parameter.name, nextValue);
    onCommit?.();
  };

  return (
    <Field>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(6.75rem,1.1fr)_minmax(0,1.5fr)_2.25rem] items-center gap-1.5">
        <FieldTitle
          className="min-w-0 w-full overflow-hidden text-xs"
          title={parameter.name}
        >
          <span className="block min-w-0 truncate">{parameter.name}</span>
        </FieldTitle>
        <div className="flex min-w-0 items-center overflow-hidden rounded-md border border-input bg-background shadow-xs">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => stepValue(-1)}
            disabled={isAtMin}
            aria-label={`Decrease ${parameter.name}`}
            className="size-8 shrink-0 rounded-none border-r border-input shadow-none"
          >
            <Minus />
          </Button>
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => {
              const num = Number(inputValue);

              if (isNaN(num)) {
                setInputValue(String(parameter.value));
                return;
              }

              const clamped = Math.min(max, Math.max(min, num));
              if (clamped === parameter.value) {
                setInputValue(String(parameter.value));
                return;
              }

              onBeforeCommit?.();
              updateValue(parameter.name, clamped);
              onCommit?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="h-8 min-w-0 flex-1 rounded-none border-0 px-2 text-center text-xs shadow-none focus-visible:ring-0 md:text-xs"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => stepValue(1)}
            disabled={isAtMax}
            aria-label={`Increase ${parameter.name}`}
            className="size-8 shrink-0 rounded-none border-l border-input shadow-none"
          >
            <Plus />
          </Button>
        </div>

        <Slider
          value={[parameter.value]}
          onValueChange={(values) => {
            if (!isSliderEditingRef.current) {
              onBeforeCommit?.();
              isSliderEditingRef.current = true;
            }

            updateValue(parameter.name, values[0]);
          }}
          onValueCommit={(values) => {
            if (values[0] !== parameter.value) {
              updateValue(parameter.name, values[0]);
            }
            isSliderEditingRef.current = false;
            onCommit?.();
          }}
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          className="min-w-0"
        />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(parameter)}
          className="size-8"
        >
          <Pencil />
        </Button>
      </div>
    </Field>
  );
};

const getStepPrecision = (step: number): number => {
  if (!Number.isFinite(step)) {
    return 0;
  }

  const stepString = String(step);

  if (stepString.includes('e-')) {
    return Number(stepString.split('e-')[1]);
  }

  return stepString.split('.')[1]?.length ?? 0;
};

const roundToPrecision = (value: number, precision: number): number => {
  if (!Number.isFinite(value) || precision <= 0) {
    return value;
  }

  const multiplier = 10 ** precision;

  return Math.round(value * multiplier) / multiplier;
};
