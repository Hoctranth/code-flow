import React, { useEffect } from "react";
import ReactFlow, { Background, Controls, ReactFlowProvider, useNodesState, useEdgesState, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import { NodeData, EdgeData } from "@/app/actions";
import CustomNode from "./nodes/CustomNode";
import { useLayout, LayoutAlgorithm } from "@/hooks/useLayout";

const nodeTypes = {
  customNode: CustomNode,
};

interface CallGraphProps {
  nodes: NodeData[];
  edges: EdgeData[];
  onNodeClick?: (event: React.MouseEvent, node: any) => void;
  algorithm: LayoutAlgorithm;
  direction: "TB" | "LR";
  theme?: "dark" | "light" | "dracula";
}

function CallGraphInner({ nodes: initialNodes, edges: initialEdges, onNodeClick, algorithm, direction }: CallGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>(initialNodes as any);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>(initialEdges as any);
  const [isLayouting, setIsLayouting] = React.useState(false);

  useLayout(initialNodes, initialEdges, algorithm, direction, setNodes, setEdges, setIsLayouting);

  return (
    <div className="w-full h-full relative">
      {isLayouting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-app-bg/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-panel-bg p-6 rounded-xl border border-border-main shadow-2xl">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-emerald-500 font-medium text-sm animate-pulse">Calculating layout...</span>
          </div>
        </div>
      )}
      <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--border-light)" gap={24} size={2} />
      <Controls className="bg-btn-bg border-border-main fill-txt-primary" />
      <MiniMap 
        nodeColor={(n: any) => {
          if (n.data?.isExternal) return '#52525b'; // Zinc for external
          return n.data?.isJsx ? '#10b981' : '#3b82f6'; // Emerald for JSX, Blue for Function
        }}
        maskColor="var(--app-bg)"
        style={{ 
          backgroundColor: 'var(--panel-bg)', 
          border: '1px solid var(--border-main)', 
          borderRadius: '8px',
          opacity: 0.8
        }} 
      />
      </ReactFlow>
    </div>
  );
}

export default function CallGraph(props: CallGraphProps) {
  return (
    <div className="w-full h-full">
      <style>{`
        .react-flow__node:hover {
          z-index: 1000 !important;
        }
      `}</style>
      <ReactFlowProvider>
        <CallGraphInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
