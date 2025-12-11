import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';

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
  className?: string;
}

export const ParametersPane = ({
  parameters,
  className,
}: ParametersPaneProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Parameters</CardTitle>
      </CardHeader>
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
    </Card>
  );
};
