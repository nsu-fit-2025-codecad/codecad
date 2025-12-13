import React, { useRef, useState } from 'react';
import { editor } from 'monaco-editor';
import IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
import makerjs from 'makerjs';
import { ParametersPane } from '@/components/parameters-pane';
import { useParametersStore } from '@/store/store';
import { CodeEditor } from '@/components/code-editor';

export const HomePage = () => {
  const [svg, setSvg] = useState<string>('');
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const evalInput = () => {
    const value = editorRef.current?.getValue();
    if (!value) {
      return;
    }
    try {
      const params = parameters.reduce(
        (acc, param) => {
          acc[param.name] = param.value;
          return acc;
        },
        {} as Record<string, number>
      );

      const createModel = new Function(
        'makerjs',
        'params',
        `return (function() {
          ${value}
        })();`
      );

      const model = createModel(makerjs, params);

      const svgString = makerjs.exporter.toSVG(model);

      setSvg(svgString);
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  };

  const defaultCode = `const square = new makerjs.models.Square(100);

const circle = new makerjs.models.Ring(50);
circle.origin = [150, 0];

const model = {
  models: {
    square: square,
    circle: circle
  }
};

return model;`;

  const { parameters } = useParametersStore();

  return (
    <div className="flex">
      <div className="flex flex-col gap-1 h-screen justify-between pb-4 pt-32">
        <h1>HomePage</h1>
        <h2>Result Model</h2>
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="w-full h-full"
        />
        <CodeEditor
          onExecuteCode={evalInput}
          onMount={handleEditorDidMount}
          defaultCode={defaultCode}
        />
      </div>
      <ParametersPane
        className="fixed right-4 w-80 top-4 h-[calc(100vh-2rem)]"
        onParametersEdit={() => {}}
        parameters={parameters}
      />
    </div>
  );
};
