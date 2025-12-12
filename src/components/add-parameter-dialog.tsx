import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useParametersStore } from '@/store/store';
import { useState } from 'react';

const addParameterFormSchema = (existingNames: string[]) =>
  z.object({
    name: z
      .string()
      .min(1, 'Name is required')
      .refine(
        (name) => !existingNames.includes(name),
        'Parameter with this name already exists'
      ),
    value: z.coerce.number<number>().min(1),
    min: z.coerce.number<number>().min(1),
    max: z.coerce.number<number>().min(1),
    step: z.coerce.number<number>().min(1),
  });

type AddParameterFormData = z.infer<ReturnType<typeof addParameterFormSchema>>;

export const AddParameterDialog = () => {
  const [open, setOpen] = useState(false);

  const { parameters, add, edit } = useParametersStore();

  const existingNames = parameters.map((parameter) => parameter.name);

  const form = useForm<AddParameterFormData>({
    resolver: zodResolver(addParameterFormSchema(existingNames)),
    defaultValues: {
      name: '',
      value: 1,
      min: 1,
      max: 100,
      step: 1,
    },
  });

  function onSubmit(data: AddParameterFormData) {
    add({
      ...data,
      onValueChange: (value) => edit(data.name, { value }),
    });
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="flex-1">Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Parameter</DialogTitle>
        </DialogHeader>
        <form id="add-parameter-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor="add-parameter-form-name">
                    Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="add-parameter-form-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Name"
                  />
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
                  <FieldLabel htmlFor="add-parameter-form-name">
                    Value
                  </FieldLabel>
                  <Input
                    {...field}
                    type={'number'}
                    id="add-parameter-form-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="1"
                  />
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
                    <FieldLabel htmlFor="add-parameter-form-min">
                      Min Value
                    </FieldLabel>
                    <Input
                      {...field}
                      type={'number'}
                      id="add-parameter-form-min"
                      aria-invalid={fieldState.invalid}
                    />
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
                    <FieldLabel htmlFor="add-parameter-form-max">
                      Max Value
                    </FieldLabel>
                    <Input
                      {...field}
                      type={'number'}
                      id="add-parameter-form-max"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />{' '}
              <Controller
                name="step"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="add-parameter-form-step">
                      Change Step
                    </FieldLabel>
                    <Input
                      {...field}
                      type={'number'}
                      id="add-parameter-form-step"
                      aria-invalid={fieldState.invalid}
                    />
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
          <Button type="submit" form="add-parameter-form">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
