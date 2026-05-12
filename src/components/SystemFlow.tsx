import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  MarkerType,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css'; // Quan trọng: phải import css
import dagre from 'dagre';
import SystemNode from './nodes/SystemNode';

const nodeTypes = {
  systemNode: SystemNode,
};

// Các Nodes (Khối) của sơ đồ
const initialNodes = [
  {
    id: 'customer',
    type: 'systemNode',
    position: { x: 50, y: 200 },
    data: { label: 'Khách Hàng', icon: '👤', isActor: true },
  },
  {
    id: 'sale',
    type: 'systemNode',
    position: { x: 300, y: 200 },
    data: { label: 'Sale Manager', icon: '💼', isActor: true },
  },
  {
    id: 'director',
    type: 'systemNode',
    position: { x: 550, y: 400 }, // Central Hub
    data: { label: 'Director (Workspace)', icon: '👑', isActor: true },
  },
  {
    id: 'prod',
    type: 'systemNode',
    position: { x: 850, y: 200 },
    data: { label: 'Prod Manager', icon: '⚙️', isActor: false },
  },
  {
    id: 'qc',
    type: 'systemNode',
    position: { x: 1050, y: 400 }, // Gatekeeper Hub
    data: { label: 'QC Manager', icon: '🔍', isActor: true },
  },
  {
    id: 'warehouse',
    type: 'systemNode',
    position: { x: 1250, y: 200 },
    data: { label: 'Warehouse', icon: '📦', isActor: false },
  },
  {
    id: 'purchase',
    type: 'systemNode',
    position: { x: 850, y: 600 },
    data: { label: 'Purchase Manager', icon: '🛒', isActor: true },
  },
  {
    id: 'supplier',
    type: 'systemNode',
    position: { x: 1250, y: 600 },
    data: { label: 'Nhà Cung Cấp', icon: '🏭', isActor: false },
  },
];

// Styles cho các loại luồng
const flowStyle = { stroke: '#3b82f6', strokeWidth: 2 }; // Blue
const successStyle = { stroke: '#22c55e', strokeWidth: 2 }; // Green
const checkStyle = { stroke: '#8b5cf6', strokeWidth: 2 }; // Purple
const alertStyle = { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }; // Red dashed

// Chỉnh sửa label cho Dark mode để dễ đọc hơn
const commonLabelProps = {
  labelStyle: { fill: '#ffffff', fontWeight: 600, fontSize: 11 },
  labelBgStyle: { fill: '#1e293b', fillOpacity: 0.9 },
  labelBgPadding: [8, 4] as [number, number],
  labelBgBorderRadius: 4,
};

// Base Edges (Không có sourceHandle/targetHandle để Auto Layout)
const baseEdges = [
  { id: 'e1', source: 'customer', target: 'sale', label: '1. Yêu cầu mua hàng', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e2', source: 'sale', target: 'director', label: '2. Trình duyệt Đơn', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e3', source: 'director', target: 'prod', label: '3. Lệnh Sản Xuất', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e4', source: 'prod', target: 'warehouse', label: '4. Kiểm tra tồn kho', type: 'bezier', style: checkStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e5', source: 'warehouse', target: 'prod', label: '5. Thiếu vật tư', type: 'bezier', animated: true, style: alertStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e6', source: 'prod', target: 'purchase', label: '6. Yêu cầu Vật tư', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e7', source: 'purchase', target: 'supplier', label: '7. Lấy báo giá', type: 'bezier', style: checkStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e8', source: 'supplier', target: 'purchase', label: '8. Thông tin giá', type: 'bezier', animated: true, style: alertStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e9', source: 'purchase', target: 'director', label: '9. Trình duyệt PO', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e10', source: 'director', target: 'purchase', label: '10. GĐ Phê duyệt PO', type: 'bezier', animated: true, style: alertStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e11', source: 'purchase', target: 'supplier', label: '11. Gửi Đơn (PO)', type: 'bezier', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  { id: 'e12', source: 'supplier', target: 'qc', label: '12. Giao VT / QC Kiểm', type: 'bezier', style: checkStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e13', source: 'qc', target: 'warehouse', label: '13. QC Pass / Nhận VT', type: 'bezier', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  { id: 'e14', source: 'warehouse', target: 'director', label: '14. Trình Xuất Kho VT', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e15', source: 'director', target: 'prod', label: '15. GĐ Duyệt / Cấp VT', type: 'bezier', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  { id: 'e16', source: 'prod', target: 'qc', label: '16. SX Xong / QC Kiểm', type: 'bezier', style: checkStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e17', source: 'qc', target: 'director', label: '17. QC Pass / Trình GĐ', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e18', source: 'director', target: 'warehouse', label: '18. GĐ Duyệt / Nhập TP', type: 'bezier', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  { id: 'e19', source: 'warehouse', target: 'director', label: '19. Trình Xuất Giao Hàng', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e20', source: 'director', target: 'customer', label: '20. GĐ Duyệt / Giao hàng', type: 'bezier', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
];

// Edges cho Hub Layout (Có Handles để đi đường nét không bị chéo)
const hubEdges = [
  // --- 1. KHỞI TẠO ĐƠN & LỆNH SẢN XUẤT ---
  { id: 'e1', source: 'customer', target: 'sale', sourceHandle: 's-right', targetHandle: 't-left', label: '1. Yêu cầu mua hàng', type: 'straight', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e2', source: 'sale', target: 'director', sourceHandle: 's-bottom', targetHandle: 't-left', label: '2. Trình duyệt Đơn', type: 'smoothstep', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e3', source: 'director', target: 'prod', sourceHandle: 's-top', targetHandle: 't-left', label: '3. Lệnh Sản Xuất', type: 'smoothstep', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  
  { id: 'e4', source: 'prod', target: 'warehouse', sourceHandle: 's-right', targetHandle: 't-left', label: '4. Kiểm tra tồn kho', type: 'straight', style: checkStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e5', source: 'warehouse', target: 'prod', sourceHandle: 's-bottom', targetHandle: 't-bottom', label: '5. Thiếu vật tư', type: 'bezier', animated: true, style: alertStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },

  // --- 2. MUA SẮM VẬT TƯ ---
  { id: 'e6', source: 'prod', target: 'purchase', sourceHandle: 's-bottom', targetHandle: 't-top', label: '6. Yêu cầu Vật tư', type: 'straight', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e7', source: 'purchase', target: 'supplier', sourceHandle: 's-right', targetHandle: 't-left', label: '7. Lấy báo giá', type: 'straight', style: checkStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e8', source: 'supplier', target: 'purchase', sourceHandle: 's-bottom', targetHandle: 't-bottom', label: '8. Thông tin giá', type: 'bezier', animated: true, style: alertStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  
  { id: 'e9', source: 'purchase', target: 'director', sourceHandle: 's-left', targetHandle: 't-bottom', label: '9. Trình duyệt PO', type: 'smoothstep', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e10', source: 'director', target: 'purchase', sourceHandle: 's-right', targetHandle: 't-right', label: '10. GĐ Phê duyệt PO', type: 'bezier', animated: true, style: alertStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e11', source: 'purchase', target: 'supplier', sourceHandle: 's-top', targetHandle: 't-top', label: '11. Gửi Đơn (PO)', type: 'bezier', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  
  // --- 3. NHẬP VẬT TƯ (Có QC) ---
  { id: 'e12', source: 'supplier', target: 'qc', sourceHandle: 's-top', targetHandle: 't-bottom', label: '12. Giao VT / QC Kiểm', type: 'smoothstep', style: checkStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e13', source: 'qc', target: 'warehouse', sourceHandle: 's-right', targetHandle: 't-bottom', label: '13. QC Pass / Nhận VT', type: 'smoothstep', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  
  // --- 4. XUẤT VẬT TƯ CHO SẢN XUẤT ---
  // Định tuyến ra Nóc nhà để không cắt ngang đồ thị
  { id: 'e14', source: 'warehouse', target: 'director', sourceHandle: 's-top', targetHandle: 't-top', label: '14. Trình Xuất Kho VT', type: 'smoothstep', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e15', source: 'director', target: 'prod', sourceHandle: 's-right', targetHandle: 't-bottom', label: '15. GĐ Duyệt / Cấp VT', type: 'bezier', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  
  // --- 5. SẢN XUẤT HOÀN THÀNH (Có QC & GĐ) ---
  { id: 'e16', source: 'prod', target: 'qc', sourceHandle: 's-right', targetHandle: 't-top', label: '16. SX Xong / QC Kiểm', type: 'smoothstep', style: checkStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e17', source: 'qc', target: 'director', sourceHandle: 's-left', targetHandle: 't-right', label: '17. QC Pass / Trình GĐ', type: 'straight', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  
  // Định tuyến dưới Đáy nhà để không cắt ngang
  { id: 'e18', source: 'director', target: 'warehouse', sourceHandle: 's-bottom', targetHandle: 't-right', label: '18. GĐ Duyệt / Nhập TP', type: 'smoothstep', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
  
  // --- 6. XUẤT KHO GIAO HÀNG ---
  { id: 'e19', source: 'warehouse', target: 'director', sourceHandle: 's-top', targetHandle: 't-top', label: '19. Trình Xuất Giao Hàng', type: 'bezier', style: flowStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e20', source: 'director', target: 'customer', sourceHandle: 's-left', targetHandle: 't-bottom', label: '20. GĐ Duyệt / Giao hàng', type: 'smoothstep', style: successStyle, ...commonLabelProps, markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' } },
];

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  // Ranksep/nodesep để nới rộng khoảng cách tránh label đè lên vạch
  dagreGraph.setGraph({ rankdir: direction, ranksep: 150, nodesep: 150 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 110,
        y: nodeWithPosition.y - 50,
      },
    };
  });

  return { nodes: newNodes, edges };
};

export default function SystemFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(hubEdges);
  const [activeLayout, setActiveLayout] = useState<'hub' | 'LR' | 'TB'>('hub');

  useEffect(() => {
    if (activeLayout === 'hub') {
      setNodes([...initialNodes]);
      setEdges([...hubEdges]);
    } else {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        [...initialNodes], // clone
        [...baseEdges], // clone base edges
        activeLayout
      );
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    }
  }, [activeLayout, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        minZoom={0.2}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
        
        {/* Nút bấm chuyển đổi Layout */}
        <Panel position="top-right" className="bg-slate-800/80 p-2 rounded-xl backdrop-blur-md border border-slate-700 flex gap-2 shadow-xl m-4">
          <button
            onClick={() => setActiveLayout('hub')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeLayout === 'hub' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            🎯 Hub Layout (Mạng lưới)
          </button>
          <button
            onClick={() => setActiveLayout('LR')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeLayout === 'LR' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            ➡️ Tiền trình ngang (LR)
          </button>
          <button
            onClick={() => setActiveLayout('TB')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeLayout === 'TB' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⬇️ Phân cấp dọc (TB)
          </button>
        </Panel>

      </ReactFlow>
    </div>
  );
}
