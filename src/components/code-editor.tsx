import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Editor, Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import React from 'react';
import { Button } from '@/components/ui/button';
import IStandaloneCodeEditor = editor.IStandaloneCodeEditor;

interface CodeEditorProps {
  onExecuteCode: () => void;
  onMount: (editor: IStandaloneCodeEditor, monaco: Monaco) => void;
  className?: string;
  defaultCode?: string;
}

export const CodeEditor = ({
  onExecuteCode,
  onMount,
  className,
  defaultCode,
}: CodeEditorProps) => {
  return (
    <Card className={className}>
      <CardContent className="pt-12">
        <Editor
          height="30vh"
          width="40vw"
          defaultLanguage="javascript"
          defaultValue={defaultCode}
          onMount={onMount}
        />
      </CardContent>
      <CardFooter className="pb-3">
        <Button className="cursor-pointer" onClick={onExecuteCode}>
          ▶ Run
        </Button>
      </CardFooter>
    </Card>
  );
};
