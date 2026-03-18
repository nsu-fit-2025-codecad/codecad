import React from 'react';
import { Field, FieldTitle, FieldDescription } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import type { Parameter } from '@/store/store';

type ParameterControlProps = {
  parameter: Parameter;
  updateValue: (name: string, value: number) => void;
};

export const ParameterControl = ({
  parameter,
  updateValue,
}: ParameterControlProps) => {
  const [inputValue, setInputValue] = React.useState(String(parameter.value));

  React.useEffect(() => {
    setInputValue(String(parameter.value));
  }, [parameter.value]);

  const min = parameter.min ?? -Infinity;
  const max = parameter.max ?? Infinity;

  return (
    <Field>
      <FieldTitle>{parameter.name}</FieldTitle>
      <FieldDescription>{parameter.value}</FieldDescription>

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
            updateValue(parameter.name, clamped);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-24"
        />

        <Slider
          value={[parameter.value]}
          onValueChange={(values) => updateValue(parameter.name, values[0])}
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          className="flex-1"
        />
      </div>
    </Field>
  );
};
