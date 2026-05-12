"use client";

import { useState, useEffect, useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import CallGraph from "@/components/CallGraph";
import { parseCode, NodeData, EdgeData } from "./actions";
import { LayoutAlgorithm } from "@/hooks/useLayout";
import lzString from "lz-string";

const DEFAULT_CODE = `function login() {
  validate()
  save()
}

function validate() {}

function save() {}
`;

export default function Home() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleNodeClick = (event: React.MouseEvent, node: any) => {
    const { startLine, endLine, label } = node.data;
    if (startLine && endLine) {
      if (editorRef.current) {
        if (!showEditor) setShowEditor(true);

        // Reveal line in center
        editorRef.current.revealLineInCenter(startLine);

        // Highlight selection
        editorRef.current.setSelection({
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: endLine,
          endColumn: 1000, // Select to end of line
        });

        // Focus editor
        editorRef.current.focus();
        showToast(`Jumped to definition of ${label}`);
      }
    } else {
      showToast(`${label} is imported or not defined in this file`);
    }
  };

  // View state
  const [direction, setDirection] = useState<"TB" | "LR">("TB");
  const [algorithm, setAlgorithm] = useState<LayoutAlgorithm>("dagre");
  const [showEditor, setShowEditor] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light" | "dracula">("dark");

  // Load code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compressedCode = params.get("code");
    if (compressedCode) {
      const decompressed =
        lzString.decompressFromEncodedURIComponent(compressedCode);
      if (decompressed) {
        setCode(decompressed);
      }
    }
  }, []);

  // Sync theme to body
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleShare = () => {
    const compressed = lzString.compressToEncodedURIComponent(code);
    const url = new URL(window.location.href);
    url.searchParams.set("code", compressed);
    navigator.clipboard.writeText(url.toString());
    showToast("Link copied to clipboard!");
  };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setIsParsing(true);
      try {
        const result = await parseCode(code, direction);
        setNodes(result.nodes);
        setEdges(result.edges);
      } catch (err) {
        console.error("Parsing failed", err);
      } finally {
        setIsParsing(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [code, direction]);

  return (
    <div className="flex flex-col h-screen w-full bg-app-bg text-txt-primary font-sans overflow-hidden transition-colors duration-300">
      <div className="flex flex-1 overflow-hidden relative w-full h-full">
        {/* Left Sidebar: Monaco Editor */}
        {showEditor && (
          <div className="w-[400px] h-full flex flex-col bg-panel-bg border-r border-border-main shrink-0 z-10 shadow-2xl relative transition-colors duration-300">
            <div className="px-4 py-3 bg-surface-bg border-b border-border-main flex items-center justify-between transition-colors duration-300">
              <h1 className="text-xs font-bold text-txt-secondary uppercase tracking-widest">
                Source Code
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditor(false)}
                  className="text-txt-muted hover:text-txt-primary text-xs px-2 py-1 bg-btn-bg hover:bg-btn-hover rounded transition-colors duration-300"
                >
                  Hide
                </button>
              </div>
            </div>
            <div className="flex-1 relative">
              {isParsing && (
                <div className="absolute top-2 right-4 z-10 text-xs font-medium text-emerald-500 animate-pulse bg-panel-bg/80 px-2 py-1 rounded">
                  Parsing...
                </div>
              )}
              <Editor
                height="100%"
                defaultLanguage="typescript"
                theme={theme === "light" ? "light" : "vs-dark"}
                value={code}
                onChange={(value) => setCode(value || "")}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: "on",
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                }}
              />
            </div>
          </div>
        )}

        {/* Main Canvas: React Flow */}
        <div className="flex-1 h-full flex flex-col relative bg-app-bg transition-colors duration-300">
          {/* Floating Toolbar */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            {!showEditor && (
              <button
                onClick={() => setShowEditor(true)}
                className="px-3 py-1.5 bg-btn-bg hover:bg-btn-hover text-txt-primary text-xs font-medium rounded-md border border-border-main shadow-lg transition-colors"
              >
                Open Editor
              </button>
            )}

            <div className="flex bg-btn-bg border border-border-main rounded-md shadow-lg overflow-hidden items-center">
              <span className="text-[10px] uppercase font-bold text-txt-muted px-2">
                Theme:
              </span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="bg-transparent text-xs font-medium text-txt-primary py-1.5 px-2 outline-none cursor-pointer hover:bg-btn-hover"
              >
                <option value="dark" className="bg-panel-bg">
                  Dark
                </option>
                <option value="light" className="bg-panel-bg">
                  Light
                </option>
                <option value="dracula" className="bg-panel-bg">
                  Dracula
                </option>
              </select>

              <div className="w-[1px] h-4 bg-border-light mx-1"></div>

              <span className="text-[10px] uppercase font-bold text-txt-muted px-2">
                Layout:
              </span>
              <select
                value={algorithm}
                onChange={(e) =>
                  setAlgorithm(e.target.value as LayoutAlgorithm)
                }
                className="bg-transparent text-xs font-medium text-txt-primary py-1.5 px-2 outline-none cursor-pointer hover:bg-btn-hover"
              >
                <option value="dagre" className="bg-panel-bg">
                  Dagre
                </option>
                <option value="elk" className="bg-panel-bg">
                  ELK
                </option>
                <option value="force" className="bg-panel-bg">
                  Force
                </option>
              </select>

              <div className="w-[1px] h-4 bg-border-light mx-1"></div>

              <button
                onClick={() => setDirection("TB")}
                disabled={algorithm === "force"}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${direction === "TB" ? "bg-emerald-600/20 text-emerald-500" : "text-txt-secondary hover:bg-btn-hover"} disabled:opacity-50`}
              >
                TB
              </button>
              <div className="w-[1px] bg-border-main"></div>
              <button
                onClick={() => setDirection("LR")}
                disabled={algorithm === "force"}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${direction === "LR" ? "bg-emerald-600/20 text-emerald-500" : "text-txt-secondary hover:bg-btn-hover"} disabled:opacity-50`}
              >
                LR
              </button>
            </div>

            <button
              onClick={handleShare}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-500 border border-emerald-600/30 text-xs font-medium rounded-md shadow-lg transition-colors flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
              Share
            </button>
          </div>

          {/* Stats */}
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-1.5 bg-surface-bg/80 backdrop-blur text-xs font-medium text-txt-secondary rounded-md border border-border-main transition-colors duration-300">
              {nodes.length} Nodes, {edges.length} Edges
            </div>
          </div>

          <div className="flex-1 w-full h-full">
            {nodes.length === 0 && !isParsing && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <p className="text-txt-muted">No function calls detected</p>
              </div>
            )}
            {toastMessage && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-panel-bg border border-border-main text-txt-primary px-4 py-2 rounded-md shadow-2xl text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
                {toastMessage}
              </div>
            )}
            <CallGraph
              key={`${direction}-${algorithm}`}
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              algorithm={algorithm}
              direction={direction}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
