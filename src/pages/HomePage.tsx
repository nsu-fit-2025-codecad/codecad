import React, { useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
import makerjs from 'makerjs';
import { ParametersPane } from '@/components/parameters-pane';

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
      const createModel = new Function(
        'makerjs',
        `return (function() {
          ${value}
        })();`
      );

      const model = createModel(makerjs);

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

  return (
    <div className="flex">
      <div className="flex flex-col gap-1">
        <h1>HomePage</h1>
        <h2>Result Model</h2>
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="w-full h-full"
        />
        <h2>Editor</h2>
        <Editor
          className="border-black border"
          height="30vh"
          width="40vw"
          defaultLanguage="javascript"
          defaultValue={defaultCode}
          onMount={handleEditorDidMount}
        />
        <button
          onClick={evalInput}
          type="button"
          className="flex items-center w-fit gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0E639C] hover:bg-[#1177BB] active:bg-[#005A9E] focus:outline-hidden focus:ring-1 focus:ring-[#007ACC] transition-colors duration-150 rounded-sm"
        >
          ▶ Run
        </button>
      </div>
      <ParametersPane
        className="fixed right-4 w-80 top-4 h-[calc(100vh-2rem)]"
        parameters={[
          {
            name: 'Parameter one',
            value: 50,
            onValueChange: () => {},
          },
          {
            name: 'Parameter two',
            value: 500,
            onValueChange: () => {},
          },
          {
            name: 'Parameter three',
            value: 123,
            onValueChange: () => {},
          },
        ]}
      />
    </div>
  );
};
