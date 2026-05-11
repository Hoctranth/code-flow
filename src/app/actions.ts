"use server";

import { Project, SyntaxKind, Node } from "ts-morph";

export type NodeData = {
  id: string;
  type?: string;
  data: { 
    label: string; 
    isJsx?: boolean; 
    direction?: string; 
    startLine?: number; 
    endLine?: number; 
    isExternal?: boolean;
    isComplex?: boolean;
    complexityReasons?: string[];
  };
  position: { x: number; y: number };
  targetPosition?: 'top' | 'left' | 'bottom' | 'right';
  sourcePosition?: 'top' | 'left' | 'bottom' | 'right';
};

export type EdgeData = {
  id: string;
  source: string;
  target: string;
  label?: string;
  style?: any;
  type?: string;
  animated?: boolean;
  labelStyle?: any;
  labelBgStyle?: any;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
};

// Helper to extract the name of a function-like node
function getFunctionName(node: Node): string | undefined {
  if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
    return node.getName();
  }
  
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
    const parent = node.getParent();
    if (Node.isVariableDeclaration(parent)) {
      return parent.getName();
    }
    if (Node.isPropertyAssignment(parent)) {
      return parent.getName();
    }
  }
  return undefined;
}

export async function parseCode(code: string, direction: string = "TB"): Promise<{ nodes: NodeData[]; edges: EdgeData[] }> {
  try {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile("temp.tsx", code); // Use .tsx extension for JSX parsing
    const relations: { from: string; to: string; type?: string }[] = [];
    const uniqueNodes = new Set<string>();
    const jsxComponents = new Set<string>();
    const nodeDefinitions = new Map<string, { startLine: number, endLine: number, type: 'local' | 'import' }>();

    // 0. Find Imports
    sourceFile.getImportDeclarations().forEach(imp => {
      imp.getNamedImports().forEach(named => {
        nodeDefinitions.set(named.getName(), {
          startLine: named.getStartLineNumber(),
          endLine: named.getEndLineNumber(),
          type: 'import'
        });
      });
      const defaultImport = imp.getDefaultImport();
      if (defaultImport) {
        nodeDefinitions.set(defaultImport.getText(), {
          startLine: imp.getStartLineNumber(),
          endLine: imp.getEndLineNumber(),
          type: 'import'
        });
      }
    });
    // 1. Find all functions and add them as nodes (even if they have no calls)
    sourceFile.forEachDescendant((node) => {
      if (
        Node.isFunctionDeclaration(node) ||
        Node.isMethodDeclaration(node) ||
        Node.isArrowFunction(node) ||
        Node.isFunctionExpression(node)
      ) {
        const fnName = getFunctionName(node);
        if (fnName) {
          uniqueNodes.add(fnName);
          nodeDefinitions.set(fnName, {
            startLine: node.getStartLineNumber(),
            endLine: node.getEndLineNumber(),
            type: 'local'
          });
        }
      }
    });

    // 2. Find all function calls and determine their parent function
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    callExpressions.forEach((callExpr) => {
      const expression = callExpr.getExpression();
      const targetName = expression.getText();

      // Noise reduction: Ignore console.* and common array methods
      if (targetName.startsWith("console.")) return;
      const ignoreMethods = ["map", "filter", "reduce", "forEach", "some", "every", "find", "findIndex"];
      // If it's something like array.map, targetName might be "data.map" or just "map"
      // Let's do a simple check for the suffix
      if (ignoreMethods.some(method => targetName.endsWith(`.${method}`) || targetName === method)) {
        return;
      }

      // Attempt to resolve definition using TypeScript symbol (for variables, props, hooks)
      if (Node.isIdentifier(expression) && !nodeDefinitions.has(targetName)) {
        const symbol = expression.getSymbol();
        if (symbol) {
          const decls = symbol.getDeclarations();
          if (decls && decls.length > 0) {
            const decl = decls[0];
            if (decl.getSourceFile() === sourceFile) {
               const isImport = Node.isImportSpecifier(decl) || Node.isImportClause(decl);
               nodeDefinitions.set(targetName, {
                 startLine: decl.getStartLineNumber(),
                 endLine: decl.getEndLineNumber(),
                 type: isImport ? 'import' : 'local'
               });
            }
          }
        }
      }

      // Find nearest function ancestor
      const enclosingFn = callExpr.getFirstAncestor(node => 
        Node.isFunctionDeclaration(node) || 
        Node.isMethodDeclaration(node) || 
        Node.isArrowFunction(node) || 
        Node.isFunctionExpression(node)
      );

      if (enclosingFn) {
        const fnName = getFunctionName(enclosingFn);
        // Ensure both the source and target are recorded
        if (fnName && fnName !== targetName) { // ignore self-recursion for cleaner graph
          uniqueNodes.add(fnName);
          uniqueNodes.add(targetName);
          relations.push({
            from: fnName,
            to: targetName,
          });
        }
      }
    });

    // 3. Find all JSX elements (React Components)
    const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
    const jsxSelfClosingElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement);

    const processJsxElement = (jsxNode: Node, tagName: string) => {
      // Extract the base tag name if it's dotted (e.g., Typography.Text -> Typography)
      const baseTagName = tagName.split('.')[0];
      
      // Ignore native HTML elements (lowercase starting letter)
      if (baseTagName && baseTagName.charAt(0) === baseTagName.charAt(0).toLowerCase()) {
        return;
      }

      const enclosingFn = jsxNode.getFirstAncestor(node => 
        Node.isFunctionDeclaration(node) || 
        Node.isMethodDeclaration(node) || 
        Node.isArrowFunction(node) || 
        Node.isFunctionExpression(node)
      );

      if (enclosingFn) {
        const fnName = getFunctionName(enclosingFn);
        if (fnName && fnName !== tagName) {
          
          // Attempt symbol resolution for JSX tag
          let tagNode;
          if (Node.isJsxElement(jsxNode)) tagNode = jsxNode.getOpeningElement().getTagNameNode();
          else if (Node.isJsxSelfClosingElement(jsxNode)) tagNode = jsxNode.getTagNameNode();

          if (tagNode && Node.isIdentifier(tagNode) && !nodeDefinitions.has(tagName)) {
             const symbol = tagNode.getSymbol();
             if (symbol) {
                const decls = symbol.getDeclarations();
                if (decls && decls.length > 0) {
                  const decl = decls[0];
                  if (decl.getSourceFile() === sourceFile) {
                    const isImport = Node.isImportSpecifier(decl) || Node.isImportClause(decl);
                    nodeDefinitions.set(tagName, {
                      startLine: decl.getStartLineNumber(),
                      endLine: decl.getEndLineNumber(),
                      type: isImport ? 'import' : 'local'
                    });
                  }
                }
             }
          }

          uniqueNodes.add(fnName);
          uniqueNodes.add(tagName);
          jsxComponents.add(tagName);
          jsxComponents.add(fnName);
          relations.push({
            from: fnName,
            to: tagName,
            type: 'jsx' // custom marker for edges
          });
        }
      }
    };

    jsxElements.forEach(node => {
      const tagNameNode = node.getOpeningElement().getTagNameNode();
      processJsxElement(node, tagNameNode.getText());
    });

    jsxSelfClosingElements.forEach(node => {
      const tagNameNode = node.getTagNameNode();
      processJsxElement(node, tagNameNode.getText());
    });

    // Generate Initial Nodes
    const isHorizontal = direction === "LR";
    const rawNodes: NodeData[] = Array.from(uniqueNodes).map((name) => {
      const def = nodeDefinitions.get(name);
      const isExternal = def?.type === 'import' || !def;
      
      // Complexity Analyzer
      const complexityReasons: string[] = [];
      let isComplex = false;
      
      if (!isExternal && def?.startLine && def?.endLine) {
        const loc = def.endLine - def.startLine + 1;
        const outgoingEdges = relations.filter(r => r.from === name).length;
        
        if (loc > 30) complexityReasons.push(`Dài ${loc} dòng (>30)`);
        if (outgoingEdges >= 4) complexityReasons.push(`Gọi ${outgoingEdges} hàm khác (Khớp nối cao)`);
        
        isComplex = complexityReasons.length > 0;
      }

      return {
        id: name,
        type: "customNode",
        data: { 
          label: name, 
          isJsx: jsxComponents.has(name), 
          direction,
          startLine: def?.startLine,
          endLine: def?.endLine,
          isExternal,
          isComplex,
          complexityReasons
        },
        position: { x: 0, y: 0 }, 
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom',
      };
    });

    // Generate Edges
    const rawEdges: EdgeData[] = relations.map((rel: any, index) => {
      const isJsx = rel.type === 'jsx';
      const targetDef = nodeDefinitions.get(rel.to);
      const isTargetExternal = targetDef?.type === 'import' || !targetDef;

      const strokeColor = isTargetExternal ? '#52525b' : (isJsx ? '#10b981' : '#3b82f6');
      const labelColor = isTargetExternal ? '#a1a1aa' : (isJsx ? '#34d399' : '#60a5fa');
      const labelBgStroke = isTargetExternal ? '#3f3f46' : (isJsx ? '#064e3b' : '#1e3a8a');

      return {
        id: `e-${rel.from}-${rel.to}-${index}`,
        source: rel.from,
        target: rel.to,
        label: isJsx ? 'renders' : 'calls',
        type: 'bezier', 
        animated: true,
        style: { stroke: strokeColor, strokeWidth: 1.5, strokeDasharray: isJsx ? '4,4' : undefined },
        labelStyle: { fill: labelColor, fontWeight: 600, fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase' },
        labelBgStyle: { fill: '#121212', stroke: labelBgStroke, strokeWidth: 1 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 4,
      };
    });

    return { nodes: rawNodes, edges: rawEdges };
  } catch (error) {
    console.error("Failed to parse code:", error);
    return { nodes: [], edges: [] };
  }
}
