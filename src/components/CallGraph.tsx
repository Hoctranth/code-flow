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
  const [nodes, setNodes, onNodesChange] = useNodesState<any[]>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any[]>(initialEdges);

  // Sync initial nodes when algorithm or code changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, algorithm, direction, setNodes, setEdges]);

  useLayout(initialNodes, initialEdges, algorithm, direction, setNodes, setEdges);

  return (
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
