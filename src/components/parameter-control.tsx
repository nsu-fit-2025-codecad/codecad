import React from 'react';
import { Field, FieldTitle } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import type { Parameter } from '@/store/store';

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

  return (
    <Field>
      <FieldTitle>{parameter.name}</FieldTitle>

      <div className="mt-2 flex items-center gap-3">
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
          className="w-24"
        />

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
          className="flex-1"
        />

        <Button size="icon" variant="ghost" onClick={() => onEdit(parameter)}>
          Edit
        </Button>
      </div>
    </Field>
  );
};
