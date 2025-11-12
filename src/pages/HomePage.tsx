import React, { useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import IStandaloneCodeEditor = editor.IStandaloneCodeEditor;

export const HomePage = () => {
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (editor: IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const evalInput = () => {
    const value = editorRef.current?.getValue();
    if (!value) {
      return;
    }
    eval(value);
  };

  return (
    <div className="flex flex-col gap-1">
      <h1>Editor</h1>
      <Editor
        className="border-black border"
        height="30vh"
        width="40vw"
        defaultLanguage="javascript"
        defaultValue="// some comment"
        onMount={handleEditorDidMount}
      />
      <button
        onClick={evalInput}
        type="button"
        className="flex items-center w-fit gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0E639C] hover:bg-[#1177BB] active:bg-[#005A9E] focus:outline-none focus:ring-1 focus:ring-[#007ACC] transition-colors duration-150 rounded-sm"
      >
        ▶ Run
      </button>
    </div>
  );
};
