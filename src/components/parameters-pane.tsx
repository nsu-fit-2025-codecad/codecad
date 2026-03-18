import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddParameterDialog } from '@/components/add-parameter-dialog';
import { ParameterControl } from '@/components/parameter-control';
import { Button } from '@/components/ui/button';
import { useParametersStore } from '@/store/store';
import { X } from 'lucide-react';

interface ParametersPaneProps {
  onParametersEdit: () => void;
  onClose: () => void;
  className?: string;
}

export const ParametersPane = ({
  onParametersEdit,
  onClose,
  className,
}: ParametersPaneProps) => {
  const { parameters, updateValue } = useParametersStore();
  return (
    <Card className={cn(className, 'flex flex-col overflow-hidden')}>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Parameters</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="cursor-pointer"
          >
            <X />
          </Button>
        </div>
        <div className="flex gap-4">
          <AddParameterDialog />
          <Button className="flex-1" onClick={onParametersEdit}>
            Edit
          </Button>
        </div>
      </CardHeader>
      <ScrollArea className="w-full">
        <CardContent>
          <FieldSet>
            {parameters.map((parameter) => (
<<<<<<< HEAD
<<<<<<< HEAD
              <Field
                key={parameter.name}
                orientation="horizontal"
                className="[&>[data-slot=field-label]]:!flex-none"
              >
                <FieldTitle className="shrink-0 self-baseline leading-none">
                  {parameter.name}
                </FieldTitle>
                <FieldDescription className="shrink-0 self-baseline !mt-0 leading-none">
                  {parameter.value}
                </FieldDescription>
                <Slider
                  value={[parameter.value]}
                  onValueChange={(values) =>
                    updateValue(parameter.name, values[0])
                  }
                  min={parameter.min}
                  max={parameter.max}
                  step={parameter.step}
                  className="w-full flex-1"
                />
=======
              <Field key={parameter.name}>
                <FieldTitle>{parameter.name}</FieldTitle>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    type="number"
                    value={parameter.value}
                    min={parameter.min}
                    max={parameter.max}
                    step={parameter.step}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') return;

                      const num = Number(val);

                      const min = parameter.min ?? -Infinity;
                      const max = parameter.max ?? Infinity;

                      const clamped = Math.min(
                        max,
                        Math.max(min, num)
                      );

                      updateValue(parameter.name, clamped);
                    }}
                    className="w-24"
                  />

                  <Slider
                    value={[parameter.value]}
                    onValueChange={(values) =>
                      updateValue(parameter.name, values[0])
                    }
                    min={parameter.min}
                    max={parameter.max}
                    step={parameter.step}
                    className="flex-1"
                  />
                </div>
>>>>>>> 732173c (feat(parameters): added presise input and changed orientatione to horizontal)
              </Field>
=======
              <ParameterControl
                key={parameter.name}
                parameter={parameter}
                updateValue={updateValue}
              />
>>>>>>> 6228125 (feat(parameters): added keyboard input for parameters)
            ))}
          </FieldSet>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
