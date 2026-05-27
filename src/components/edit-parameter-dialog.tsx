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
import { useEffect, useState } from 'react';
import { RESERVED_WORDS } from '@/lib/constants';
import { Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parameter: Parameter | null;
  onBeforeCommit?: () => void;
  onCommit?: () => void;
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
  onBeforeCommit,
  onCommit,
}: Props) => {
  const { parameters, edit, remove } = useParametersStore();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
    setIsConfirmingDelete(false);
  }, [parameter, form]);

  useEffect(() => {
    if (!open) {
      setIsConfirmingDelete(false);
    }
  }, [open]);

  function onSubmit(data: EditParameterFormData) {
    if (!parameter) return;

    onBeforeCommit?.();
    edit(parameter.name, data);
    onCommit?.();
    onOpenChange(false);
  }

  function onDelete() {
    if (!parameter) return;

    onBeforeCommit?.();
    remove(parameter.name);
    onCommit?.();
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

        <DialogFooter className="items-center justify-between gap-3 sm:justify-between">
          {isConfirmingDelete ? (
            <>
              <p className="mr-auto rounded-md border border-destructive/40 bg-destructive/15 px-2 py-1 text-sm font-medium text-foreground">
                Delete {parameter.name}?
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={onDelete}>
                Delete parameter
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsConfirmingDelete(true)}
                className="mr-auto"
              >
                <Trash2 />
                Delete
              </Button>
              <Button type="submit" form="edit-parameter-form">
                Save
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
