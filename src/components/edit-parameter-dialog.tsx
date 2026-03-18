import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParametersStore, Parameter } from '@/store/store';
import { useEffect } from 'react';
import { RESERVED_WORDS } from '@/lib/constants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parameter: Parameter | null;
}

type EditParameterFormData = z.infer<
  ReturnType<typeof editParameterFormSchema>
>;

const editParameterFormSchema = (
  existingNames: string[],
  originalName: string
) =>
  z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/, 'Invalid variable name format')
      .refine(
        (name) => !RESERVED_WORDS.has(name),
        'Cannot use reserved JavaScript keyword'
      )
      .refine(
        (name) => name === originalName || !existingNames.includes(name),
        'Parameter with this name already exists'
      ),
    value: z.coerce.number<number>(),
    min: z.coerce.number<number>(),
    max: z.coerce.number<number>(),
    step: z.coerce.number<number>().min(0),
  });

export const EditParameterDialog = ({
  open,
  onOpenChange,
  parameter,
}: Props) => {
  const { parameters, edit } = useParametersStore();

  const existingNames = parameters.map((p) => p.name);

  const form = useForm({
    resolver: zodResolver(
      editParameterFormSchema(existingNames, parameter?.name ?? '')
    ),
    defaultValues: {
      name: '',
      value: 1,
      min: 1,
      max: 100,
      step: 1,
    },
  });

  useEffect(() => {
    if (parameter) {
      form.reset(parameter);
    }
  }, [parameter, form]);

  function onSubmit(data: EditParameterFormData) {
    if (!parameter) return;

    edit(parameter.name, data);
    onOpenChange(false);
  }

  if (!parameter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Parameter</DialogTitle>
        </DialogHeader>

        <form id="edit-parameter-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input {...field} />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="value"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Value</FieldLabel>
                  <Input {...field} type="number" />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="flex gap-4">
              <Controller
                name="min"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Min</FieldLabel>
                    <Input {...field} type="number" />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="max"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Max</FieldLabel>
                    <Input {...field} type="number" />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="step"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Step</FieldLabel>
                    <Input {...field} type="number" />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </form>

        <DialogFooter>
          <Button type="submit" form="edit-parameter-form">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
