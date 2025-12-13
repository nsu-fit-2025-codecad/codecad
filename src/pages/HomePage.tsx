import React, { useCallback, useEffect, useState } from 'react';
import makerjs from 'makerjs';
import { ParametersPane } from '@/components/parameters-pane';
import { useEditorStore, useParametersStore } from '@/store/store';
import { CodeEditor } from '@/components/code-editor';

export const HomePage = () => {
  const [svg, setSvg] = useState<string>('');

  const { parameters } = useParametersStore();
  const { code, settings } = useEditorStore();

  const evalInput = useCallback(() => {
    if (!code) {
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
          ${code}
        })();`
      );

      const model = createModel(makerjs, params);

      const svgString = makerjs.exporter.toSVG(model);

      setSvg(svgString);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [code, parameters]);

  useEffect(() => {
    if (!settings.autorun) {
      return;
    }
    evalInput();
  }, [evalInput, settings.autorun]);

  return (
    <div className="flex">
      <div className="flex flex-col gap-1 h-screen justify-between pb-4 pt-32">
        <h1>HomePage</h1>
        <h2>Result Model</h2>
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="w-full h-full"
        />
        <CodeEditor onExecuteCode={evalInput} />
      </div>
      <ParametersPane
        className="fixed right-4 w-80 top-4 h-[calc(100vh-2rem)]"
        onParametersEdit={() => {}}
        parameters={parameters}
      />
    </div>
  );
};
