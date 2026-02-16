import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddParameterDialog } from '@/components/add-parameter-dialog';
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
              <Field key={parameter.name}>
                <FieldTitle>{parameter.name}</FieldTitle>
                <FieldDescription>{parameter.value}</FieldDescription>
                <Slider
                  value={[parameter.value]}
                  onValueChange={(values) =>
                    updateValue(parameter.name, values[0])
                  }
                  min={parameter.min}
                  max={parameter.max}
                  step={parameter.step}
                  className="mt-2 w-full"
                />
              </Field>
            ))}
          </FieldSet>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
