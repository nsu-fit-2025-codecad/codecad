import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldSet } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AddParameterDialog } from '@/components/add-parameter-dialog';
import { EditParameterDialog } from '@/components/edit-parameter-dialog';
import { ParameterControl } from '@/components/parameter-control';
import { Button } from '@/components/ui/button';
import { useParametersStore, Parameter } from '@/store/store';
import { X } from 'lucide-react';

interface ParametersPaneProps {
  onClose: () => void;
  onParameterValueChange?: (name: string, value: number) => void;
  onBeforeParameterCommit?: () => void;
  onParameterCommit?: () => void;
  className?: string;
}

export const ParametersPane = ({
  onClose,
  onParameterValueChange,
  onBeforeParameterCommit,
  onParameterCommit,
  className,
}: ParametersPaneProps) => {
  const { parameters, updateValue } = useParametersStore();
  const updateParameterValue = onParameterValueChange ?? updateValue;

  const [editingParameter, setEditingParameter] = useState<Parameter | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

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
          <AddParameterDialog
            onBeforeCommit={onBeforeParameterCommit}
            onCommit={onParameterCommit}
          />
        </div>
      </CardHeader>
      <ScrollArea className="w-full">
        <CardContent>
          <FieldSet>
            {parameters.map((parameter) => (
              <ParameterControl
                key={parameter.name}
                parameter={parameter}
                updateValue={updateParameterValue}
                onBeforeCommit={onBeforeParameterCommit}
                onCommit={onParameterCommit}
                onEdit={(param) => {
                  setEditingParameter(param);
                  setIsEditOpen(true);
                }}
              />
            ))}
          </FieldSet>
        </CardContent>
      </ScrollArea>
      <EditParameterDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        parameter={editingParameter}
        onBeforeCommit={onBeforeParameterCommit}
        onCommit={onParameterCommit}
      />
    </Card>
  );
};
