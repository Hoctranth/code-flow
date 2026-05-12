import { useEffect } from 'react';
import { useReactFlow, useNodesInitialized } from 'reactflow';
import dagre from 'dagre';
import ELK from 'elkjs/lib/elk.bundled.js';
import * as d3 from 'd3-force';
import { NodeData, EdgeData } from '@/app/actions';

const elk = new ELK();

export type LayoutAlgorithm = 'dagre' | 'elk' | 'force';

export const useLayout = (
  nodes: NodeData[],
  edges: EdgeData[],
  algorithm: LayoutAlgorithm,
  direction: "TB" | "LR",
  setNodes: (nodes: any[]) => void,
  setEdges: (edges: any[]) => void,
  setIsLayouting: (isLayouting: boolean) => void
) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!nodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setIsLayouting(true);

    const applyLayout = async () => {
      let layoutedNodes = [...nodes];
      let layoutedEdges = [...edges];

      if (algorithm === 'dagre') {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        
        const nodeWidth = 200;
        const nodeHeight = 50;
        dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120, edgesep: 30 });

        layoutedNodes.forEach((node) => {
          dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
        });

        layoutedEdges.forEach((edge) => {
          dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        layoutedNodes = layoutedNodes.map((node) => {
          const nodeWithPosition = dagreGraph.node(node.id);
          return {
            ...node,
            position: {
              x: nodeWithPosition.x - nodeWidth / 2,
              y: nodeWithPosition.y - nodeHeight / 2,
            },
          };
        });
        
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsLayouting(false);
        window.requestAnimationFrame(() => fitView({ duration: 800, padding: 0.2 }));
      } 
      
      else if (algorithm === 'elk') {
        const graph = {
          id: 'root',
          layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': direction === 'TB' ? 'DOWN' : 'RIGHT',
            'elk.spacing.nodeNode': '80',
            'elk.layered.spacing.nodeNodeBetweenLayers': '120',
          },
          children: layoutedNodes.map(n => ({ id: n.id, width: 200, height: 50 })),
          edges: layoutedEdges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] }))
        };

        const layoutedGraph = await elk.layout(graph);
        
        if (layoutedGraph.children) {
          layoutedNodes = layoutedNodes.map((node) => {
            const elkNode = layoutedGraph.children!.find(n => n.id === node.id);
            return {
              ...node,
              position: {
                x: elkNode?.x || 0,
                y: elkNode?.y || 0,
              },
            };
          });
        }
        
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsLayouting(false);
        window.requestAnimationFrame(() => fitView({ duration: 800, padding: 0.2 }));
      }
    };

    if (algorithm !== 'force') {
      applyLayout();
    }
  }, [nodes, edges, algorithm, direction, setNodes, setEdges, fitView, setIsLayouting]);

  // Force Layout (Asynchronous Calculation to prevent UI freezing)
  useEffect(() => {
    if (algorithm !== 'force' || !nodes.length) return;

    setIsLayouting(true);

    // Give them a random initial position spread out a bit
    let simNodes = nodes.map(n => ({ ...n, x: Math.random() * 500, y: Math.random() * 500 }));
    let simEdges = edges.map(e => ({ ...e }));

    const simulation = d3.forceSimulation(simNodes as any)
      .force('charge', d3.forceManyBody().strength(-2000)) // Push apart
      .force('link', d3.forceLink(simEdges).id((d: any) => d.id).distance(150)) // Pull together
      .force('center', d3.forceCenter(0, 0)) // Center around 0,0
      .force('x', d3.forceX(0).strength(0.08)) // Lực hút "Trọng lực" kéo về giữa trục X
      .force('y', d3.forceY(0).strength(0.08)) // Lực hút "Trọng lực" kéo về giữa trục Y
      .force('collide', d3.forceCollide().radius(100)); // Prevent overlapping bounding boxes

    // Let the simulation run asynchronously in the background.
    // It uses an internal timer and doesn't block the main thread.
    // We only update React Flow when it's completely finished settling.
    simulation.on('end', () => {
      // Cập nhật tọa độ vào React Flow đúng 1 lần khi đã tính toán xong
      setNodes([...simNodes.map(n => ({
        ...n,
        position: { x: n.x || 0, y: n.y || 0 }
      }))]);

      setIsLayouting(false);
      window.requestAnimationFrame(() => fitView({ duration: 800, padding: 0.2 }));
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, algorithm, setNodes, fitView, setIsLayouting]);
};
