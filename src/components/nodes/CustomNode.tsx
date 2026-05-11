import { Handle, Position } from "reactflow";

export default function CustomNode({ data, isConnectable }: any) {
  const isJsx = data.isJsx;
  const isHorizontal = data.direction === "LR";
  const isExternal = data.isExternal; // If there's no line number, it's imported or built-in
  const isComplex = data.isComplex;
  const complexityReasons = data.complexityReasons || [];

  const typeLabel = isJsx
    ? (isExternal ? "Ext Component" : "Component")
    : (isExternal ? "External" : "Function");

  const colorClass = isComplex ? 'text-orange-500' : (isJsx 
    ? (isExternal ? 'text-emerald-600' : 'text-emerald-500')
    : (isExternal ? 'text-txt-secondary' : 'text-blue-500'));
    
  const bgClass = isComplex ? 'bg-surface-bg border-orange-500' : (isJsx
    ? (isExternal ? 'bg-surface-bg border-emerald-600/50' : 'bg-surface-bg border-emerald-500')
    : (isExternal ? 'bg-surface-bg border-border-main' : 'bg-surface-bg border-blue-500'));

  const shadowClass = isComplex ? 'hover:shadow-orange-500/30' : (isJsx
    ? (isExternal ? 'hover:shadow-emerald-600/20' : 'hover:shadow-emerald-500/20')
    : (isExternal ? 'hover:shadow-xl' : 'hover:shadow-blue-500/20'));

  return (
    <div className={`relative px-4 py-3 min-w-[180px] shadow-xl rounded-xl border ${bgClass} backdrop-blur-md transition-all hover:scale-105 hover:shadow-2xl ${shadowClass}`}>
      {isComplex && (
        <div className="absolute -top-2 -right-2 bg-orange-500 text-zinc-900 rounded-full p-1 shadow-lg group cursor-help z-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <div className="absolute hidden group-hover:block bottom-full right-0 mb-2 w-48 bg-panel-bg border border-orange-500/50 text-txt-primary text-xs rounded-lg p-2 shadow-xl">
            <div className="font-bold mb-1 text-orange-500">Cần Tối Ưu (Refactor):</div>
            <ul className="list-disc pl-4 space-y-1">
              {complexityReasons.map((reason: string, i: number) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        isConnectable={isConnectable}
        className={`w-3 h-3 border-2 border-app-bg ${isComplex ? 'bg-orange-500' : (isJsx ? 'bg-emerald-500' : (isExternal ? 'bg-txt-muted' : 'bg-blue-500'))}`}
      />
      
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isComplex ? 'bg-orange-500/20' : (isJsx ? 'bg-emerald-500/20' : (isExternal ? 'bg-txt-muted/20' : 'bg-blue-500/20'))} ${colorClass}`}>
          {isJsx ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          )}
        </div>
        <div className="flex flex-col">
          <span className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${colorClass}`}>
            {typeLabel}
          </span>
          <span className={`text-sm font-medium ${isExternal ? 'text-txt-secondary' : 'text-txt-primary'}`}>
            {data.label}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        isConnectable={isConnectable}
        className={`w-3 h-3 border-2 border-app-bg ${isComplex ? 'bg-orange-500' : (isJsx ? 'bg-emerald-500' : (isExternal ? 'bg-txt-muted' : 'bg-blue-500'))}`}
      />
    </div>
  );
}
