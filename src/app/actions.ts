"use server";

import { Project, SyntaxKind, Node, CallExpression } from "ts-morph";

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

// Lấy base object của một chuỗi gọi hàm (vd: a.b.c() -> lấy 'a', Swal.fire({...}).then -> lấy 'Swal')
function getBaseIdentifierName(node: Node): string {
  if (Node.isIdentifier(node)) return node.getText();
  
  let curr = node;
  while (true) {
    if (Node.isPropertyAccessExpression(curr)) {
      curr = curr.getExpression();
    } else if (Node.isCallExpression(curr)) {
      curr = curr.getExpression();
    } else if (Node.isNonNullExpression(curr)) {
      curr = curr.getExpression();
    } else if (Node.isElementAccessExpression(curr)) {
      curr = curr.getExpression();
    } else if (Node.isAwaitExpression(curr)) {
      curr = curr.getExpression();
    } else {
      break;
    }
  }
  
  if (Node.isIdentifier(curr)) return curr.getText();
  
  // Fallback: nếu vẫn không phải là Identifier, dọn dẹp bớt nội dung
  let text = node.getText();
  text = text.replace(/\([^)]*\)/g, '()').replace(/\{[^}]*\}/g, '{}');
  if (text.length > 25) text = text.substring(0, 25) + '...';
  return text;
}

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
      const name = parent.getName();
      // Bỏ qua các tên generic callback để các hàm bên trong được cuộn (roll-up) lên component cha
      if (["onClick", "onChange", "onSubmit", "onSuccess", "onError", "action", "actions", "render", "onCancel", "onOk"].includes(name)) {
         return undefined;
      }
      return name;
    }
    
    // Nếu là callback function được truyền vào một CallExpression (VD: .use(() => {}))
    const callExpr = node.getFirstAncestorByKind(SyntaxKind.CallExpression);
    if (callExpr) {
       const expression = callExpr.getExpression();
       const fullText = expression.getText();
       const ignoreMethods = ["map", "filter", "reduce", "forEach", "some", "every", "find", "findIndex"];
       if (ignoreMethods.some(method => fullText.endsWith(`.${method}`) || fullText === method)) {
         return undefined; // Bỏ qua việc tạo node cho callback của các hàm mảng (tránh tạo node tên 'prev')
       }
       // Lấy tên base của hàm đang gọi để làm tên callback (vd: axiosClient thay vì axiosClient.interceptors.response.use)
       return getBaseIdentifierName(expression);
    }
  }
  return undefined;
}

function getCallerNameFromNode(startNode: Node): string | undefined {
  let curr: Node | undefined = startNode.getParent();
  
  while (curr) {
    if (Node.isJsxOpeningElement(curr) || Node.isJsxSelfClosingElement(curr)) {
      const tagNameNode = Node.isJsxOpeningElement(curr) ? curr.getTagNameNode() : curr.getTagNameNode();
      const tagName = tagNameNode.getText();
      const baseTagName = tagName.split('.')[0];
      if (baseTagName && baseTagName.charAt(0) === baseTagName.charAt(0).toUpperCase()) {
         return tagName;
      }
    }
    
    if (Node.isFunctionDeclaration(curr) || Node.isMethodDeclaration(curr) || Node.isArrowFunction(curr) || Node.isFunctionExpression(curr)) {
       const fnName = getFunctionName(curr);
       if (fnName) return fnName;
    }
    
    if (Node.isVariableDeclaration(curr)) {
       const stmt = curr.getFirstAncestorByKind(SyntaxKind.VariableStatement);
       if (stmt && Node.isSourceFile(stmt.getParent())) {
         return curr.getName();
       }
       // Nếu không phải biến global, không return để vòng lặp tiếp tục tìm function bọc ngoài
    }
    
    if (Node.isExpressionStatement(curr) && Node.isSourceFile(curr.getParent())) {
       const exp = curr.getExpression();
       if (Node.isCallExpression(exp)) {
         return getBaseIdentifierName(exp.getExpression());
       }
    }
    
    curr = curr.getParent();
  }
  return undefined;
}

export async function parseCode(code: string, direction: string = "TB"): Promise<{ nodes: NodeData[]; edges: EdgeData[] }> {
  try {
    const project = new Project({
      useInMemoryFileSystem: true,
    });

    const sourceFile = project.createSourceFile("temp.tsx", code);
    const relations: { from: string; to: string; type?: string, label?: string }[] = [];
    const uniqueNodes = new Set<string>();
    const jsxComponents = new Set<string>();
    const nodeDefinitions = new Map<string, { startLine: number, endLine: number, type: 'local' | 'import' }>();

    // 0. Find Imports & Top-level Declarations
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

    sourceFile.getVariableStatements().forEach(stmt => {
      stmt.getDeclarations().forEach(decl => {
        nodeDefinitions.set(decl.getName(), {
          startLine: decl.getStartLineNumber(),
          endLine: decl.getEndLineNumber(),
          type: 'local'
        });
      });
    });

    // Ép các export default/named vào node để đảm bảo nó luôn là "gốc"
    sourceFile.getExportAssignments().forEach(exp => {
       const text = exp.getExpression().getText();
       if (/^[a-zA-Z0-9_]+$/.test(text)) {
          uniqueNodes.add(text);
       }
    });
    
    sourceFile.getExportDeclarations().forEach(exp => {
       exp.getNamedExports().forEach(named => {
          uniqueNodes.add(named.getName());
       });
    });

    // 1. Find all functions and add them as nodes
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
          if (!nodeDefinitions.has(fnName)) {
            nodeDefinitions.set(fnName, {
              startLine: node.getStartLineNumber(),
              endLine: node.getEndLineNumber(),
              type: 'local'
            });
          }
        }
      }
    });

    // 2. Find all function calls and determine their parent caller
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    callExpressions.forEach((callExpr) => {
      const expression = callExpr.getExpression();
      const fullText = expression.getText();

      if (fullText.startsWith("console.")) return;
      const ignoreMethods = ["map", "filter", "reduce", "forEach", "some", "every", "find", "findIndex"];
      if (ignoreMethods.some(method => fullText.endsWith(`.${method}`) || fullText === method)) {
        return;
      }

      // Rút gọn tên node (vd: axiosClient.interceptors.response.use -> axiosClient)
      const targetName = getBaseIdentifierName(expression);

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

      // Xác định "caller" (node gọi)
      let callerName = getCallerNameFromNode(callExpr);

      if (callerName && callerName !== targetName) {
        uniqueNodes.add(callerName);
        uniqueNodes.add(targetName);
        relations.push({
          from: callerName,
          to: targetName,
        });
      }

      // 2.2. Xử lý mũi tên "returns" rẽ nhánh xuống (vd: useState -> [data, setData])
      const varDecl = callExpr.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
      if (varDecl) {
         const init = varDecl.getInitializer();
         if (init) {
            let isDirect = init === callExpr;
            if (!isDirect && Node.isAwaitExpression(init)) {
               isDirect = init.getExpression() === callExpr;
            }
            if (!isDirect && Node.isAsExpression(init)) {
               isDirect = init.getExpression() === callExpr;
            }
            
            if (isDirect) {
               const varName = varDecl.getName();
               if (varName && varName !== targetName) {
                  uniqueNodes.add(targetName);
                  uniqueNodes.add(varName);
                  relations.push({
                     from: targetName,
                     to: varName,
                     label: 'returns'
                  });
               }
            }
         }
      }
    });

    // 2.5. Bắt các trường hợp truyền hàm bằng reference (vd: onClick={handleDelete} hoặc onClick: handleDelete)
    const propertyAssignments = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment);
    propertyAssignments.forEach(prop => {
       const init = prop.getInitializer();
       if (init && Node.isIdentifier(init)) {
          const targetName = init.getText();
          if (nodeDefinitions.has(targetName)) {
             const callerName = getCallerNameFromNode(prop);
             if (callerName && callerName !== targetName) {
                uniqueNodes.add(callerName);
                uniqueNodes.add(targetName);
                relations.push({ from: callerName, to: targetName, label: 'references' });
             }
          }
       }
    });

    const jsxAttributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
    jsxAttributes.forEach(attr => {
       const init = attr.getInitializer();
       if (init && Node.isJsxExpression(init)) {
          const expr = init.getExpression();
          if (expr && Node.isIdentifier(expr)) {
             const targetName = expr.getText();
             if (nodeDefinitions.has(targetName)) {
                 const callerName = getCallerNameFromNode(attr);
                 if (callerName && callerName !== targetName) {
                    uniqueNodes.add(callerName);
                    uniqueNodes.add(targetName);
                    relations.push({ from: callerName, to: targetName, label: 'references' });
                 }
             }
          }
       }
    });

    // 3. Find all JSX elements
    const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
    const jsxSelfClosingElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement);

    const processJsxElement = (jsxNode: Node, tagName: string) => {
      const baseTagName = tagName.split('.')[0];
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
            type: 'jsx'
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

    const isHorizontal = direction === "LR";
    const rawNodes: NodeData[] = Array.from(uniqueNodes).map((name) => {
      const def = nodeDefinitions.get(name);
      const isExternal = def?.type === 'import' || !def;
      
      const complexityReasons: string[] = [];
      let isComplex = false;
      
      if (!isExternal && def?.startLine && def?.endLine) {
        const loc = def.endLine - def.startLine + 1;
        const outgoingEdges = relations.filter(r => r.from === name).length;
        
        if (loc > 30) complexityReasons.push(`Dài ${loc} dòng (>30)`);
        if (outgoingEdges >= 4) complexityReasons.push(`Gọi ${outgoingEdges} hàm khác`);
        
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

    const rawEdges: EdgeData[] = relations.map((rel: any, index) => {
      const sourceNode = rawNodes.find(n => n.id === rel.from);
      const isSourceComplex = sourceNode?.data.isComplex;
      const isSourceExternal = sourceNode?.data.isExternal;
      const isSourceJsx = sourceNode?.data.isJsx;
      const isJsx = rel.type === 'jsx';

      const strokeColor = isSourceComplex ? '#f97316' : (isSourceJsx ? '#10b981' : (isSourceExternal ? '#52525b' : '#3b82f6'));
      const labelColor = isSourceComplex ? '#fb923c' : (isSourceJsx ? '#34d399' : (isSourceExternal ? '#a1a1aa' : '#60a5fa'));
      const labelBgStroke = isSourceComplex ? '#9a3412' : (isSourceJsx ? '#064e3b' : (isSourceExternal ? '#3f3f46' : '#1e3a8a'));

      return {
        id: `e-${rel.from}-${rel.to}-${index}`,
        source: rel.from,
        target: rel.to,
        label: rel.label || (isJsx ? 'renders' : 'calls'),
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
