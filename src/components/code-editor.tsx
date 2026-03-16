import { Editor } from '@monaco-editor/react';
import React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { configureCadEditor } from '@/lib/cad/editor';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/store';

interface CodeEditorProps {
  onExecuteCode: () => void;
  className?: string;
}

export const CodeEditor = ({ onExecuteCode, className }: CodeEditorProps) => {
  const { code, editCode, settings, editSettings } = useEditorStore();
  const { resolvedTheme } = useTheme();

  return (
    <div
      className={cn(className, 'flex h-full w-full flex-col overflow-hidden')}
    >
      <div className="min-h-0 flex-1 bg-background">
        <div className="h-full w-full">
          <Editor
            height="100%"
            width="100%"
            defaultLanguage="javascript"
            beforeMount={configureCadEditor}
            value={code}
            onChange={editCode}
            theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 border-t bg-background px-4 py-3">
        <Button
          className="cursor-pointer"
          onClick={onExecuteCode}
          disabled={settings.autorun}
        >
          Run
        </Button>
        <Label
          className={cn(
            'flex cursor-pointer items-center gap-2',
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
      </div>
    </div>
  );
};
