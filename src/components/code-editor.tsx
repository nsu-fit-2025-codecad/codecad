import { Editor, type OnMount } from '@monaco-editor/react';
import React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { configureCadEditor } from '@/lib/cad/editor';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/store';

const findChangedCodeRange = (previousCode: string, nextCode: string) => {
  let prefixLength = 0;
  const maxPrefixLength = Math.min(previousCode.length, nextCode.length);

  while (
    prefixLength < maxPrefixLength &&
    previousCode[prefixLength] === nextCode[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  const maxSuffixLength = Math.min(
    previousCode.length - prefixLength,
    nextCode.length - prefixLength
  );

  while (
    suffixLength < maxSuffixLength &&
    previousCode[previousCode.length - 1 - suffixLength] ===
      nextCode[nextCode.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return {
    startOffset: prefixLength,
    endOffset: previousCode.length - suffixLength,
    text: nextCode.slice(prefixLength, nextCode.length - suffixLength),
  };
};

interface CodeEditorProps {
  onExecuteCode: () => void;
  onCodeChange: (code?: string) => void;
  onAutorunChange: (autorun: boolean) => void;
  className?: string;
}

export const CodeEditor = ({
  onExecuteCode,
  onCodeChange,
  onAutorunChange,
  className,
}: CodeEditorProps) => {
  const { code, settings } = useEditorStore();
  const { resolvedTheme } = useTheme();
  const editorRef = React.useRef<Parameters<OnMount>[0] | null>(null);
  const lastAppliedCodeRef = React.useRef(code ?? '');
  const isApplyingExternalCodeRef = React.useRef(false);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    lastAppliedCodeRef.current = editor.getValue();
  };

  const handleEditorChange = (nextCode?: string) => {
    const normalizedCode = nextCode ?? '';

    lastAppliedCodeRef.current = normalizedCode;

    if (isApplyingExternalCodeRef.current) {
      return;
    }

    onCodeChange(nextCode);
  };

  React.useEffect(() => {
    const editor = editorRef.current;
    const nextCode = code ?? '';

    if (!editor || lastAppliedCodeRef.current === nextCode) {
      return;
    }

    if (editor.getValue() === nextCode) {
      lastAppliedCodeRef.current = nextCode;
      return;
    }

    const model = editor.getModel();

    if (!model) {
      return;
    }

    const previousCode = editor.getValue();
    const changedRange = findChangedCodeRange(previousCode, nextCode);
    const startPosition = model.getPositionAt(changedRange.startOffset);
    const endPosition = model.getPositionAt(changedRange.endOffset);
    const viewState = editor.saveViewState();

    try {
      isApplyingExternalCodeRef.current = true;
      model.applyEdits(
        [
          {
            range: {
              startLineNumber: startPosition.lineNumber,
              startColumn: startPosition.column,
              endLineNumber: endPosition.lineNumber,
              endColumn: endPosition.column,
            },
            text: changedRange.text,
          },
        ],
        false
      );
      lastAppliedCodeRef.current = nextCode;

      if (viewState) {
        editor.restoreViewState(viewState);
      }
    } finally {
      isApplyingExternalCodeRef.current = false;
    }
  }, [code]);

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
            defaultValue={code}
            onMount={handleEditorMount}
            onChange={handleEditorChange}
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
            onCheckedChange={(checked) => onAutorunChange(checked === true)}
          />
          <p>Autorun</p>
        </Label>
      </div>
    </div>
  );
};
