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
import { Button } from '@/components/ui/button';

interface Parameter {
  name: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

interface ParametersPaneProps {
  parameters: Parameter[];
  onParameterAdd: () => void;
  onParametersEdit: () => void;
  className?: string;
}

export const ParametersPane = ({
  parameters,
  onParameterAdd,
  onParametersEdit,
  className,
}: ParametersPaneProps) => {
  return (
    <Card className={cn(className, 'flex flex-col overflow-hidden')}>
      <CardHeader>
        <CardTitle>Parameters</CardTitle>
        <div className="flex gap-4">
          <Button className="flex-1" onClick={onParameterAdd}>
            Add
          </Button>
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
                  onValueChange={(values) => parameter.onValueChange(values[0])}
                  min={parameter.min}
                  max={parameter.max}
                  step={parameter.step}
                  className="mt-2 w-full"
                  aria-label={parameter.name}
                />
              </Field>
            ))}
          </FieldSet>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
