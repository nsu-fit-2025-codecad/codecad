import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Editor } from '@monaco-editor/react';
import React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/store';

interface CodeEditorProps {
  onExecuteCode: () => void;
  className?: string;
}

export const CodeEditor = ({ onExecuteCode, className }: CodeEditorProps) => {
  const { code, editCode, settings, editSettings } = useEditorStore();

  return (
    <Card className={className}>
      <CardContent className="pt-12">
        <Editor
          height="30vh"
          width="40vw"
          defaultLanguage="javascript"
          value={code}
          onChange={editCode}
        />
      </CardContent>
      <CardFooter className="pb-3 gap-4">
        <Button className="cursor-pointer" onClick={onExecuteCode}>
          ▶ Run
        </Button>
        <Label
          className={cn(
            'flex cursor-pointer',
            buttonVariants({ variant: 'outline' })
          )}
        >
          <Checkbox
            checked={settings.autorun}
            onCheckedChange={(checked) =>
              editSettings({ autorun: checked === true })
            }
          />
          <p>Autorun</p>
        </Label>
      </CardFooter>
    </Card>
  );
};
