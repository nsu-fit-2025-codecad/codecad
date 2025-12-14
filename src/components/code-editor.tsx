import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Editor } from '@monaco-editor/react';
import React, { useState } from 'react';
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
  const [visible, setVisible] = useState(true);

  const { code, editCode, settings, editSettings } = useEditorStore();

  return visible ? (
    <Card className={cn(className)}>
      <CardContent className="pt-12">
        <Editor
          height="30vh"
          width="40vw"
          defaultLanguage="javascript"
          value={code}
          onChange={editCode}
        />
      </CardContent>
      <CardFooter className={cn('pb-3 gap-4', !visible && 'pt-3')}>
        <Button
          className="cursor-pointer"
          onClick={onExecuteCode}
          disabled={settings.autorun}
        >
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
        <Button
          className="ml-auto cursor-pointer"
          variant="outline"
          onClick={() => setVisible(false)}
        >
          Hide
        </Button>
      </CardFooter>
    </Card>
  ) : (
    <Button
      className={cn(className, 'cursor-pointer')}
      variant="outline"
      onClick={() => setVisible(true)}
    >
      Show Editor
    </Button>
  );
};
