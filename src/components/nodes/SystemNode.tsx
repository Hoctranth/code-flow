import { Handle, Position } from "@xyflow/react";

export default function SystemNode({ data, isConnectable }: any) {
  const isActor = data.isActor;
  const isDatabase = data.isDatabase;

  const typeLabel = isActor ? "Role / Actor" : (isDatabase ? "Database" : "System Module");

  const colorClass = isActor ? 'text-blue-500' : (isDatabase ? 'text-orange-500' : 'text-emerald-500');
  const bgClass = isActor ? 'bg-surface-bg border-blue-500' : (isDatabase ? 'bg-surface-bg border-orange-500' : 'bg-surface-bg border-emerald-500');
  const shadowClass = isActor ? 'hover:shadow-blue-500/20' : (isDatabase ? 'hover:shadow-orange-500/20' : 'hover:shadow-emerald-500/20');
  const iconBgClass = isActor ? 'bg-blue-500/20' : (isDatabase ? 'bg-orange-500/20' : 'bg-emerald-500/20');

  const handleColorClass = isActor ? 'bg-blue-500' : (isDatabase ? 'bg-orange-500' : 'bg-emerald-500');

  return (
    <div className={`relative px-4 py-3 min-w-[180px] shadow-xl rounded-xl border ${bgClass} backdrop-blur-md transition-all hover:scale-105 hover:shadow-2xl ${shadowClass}`}>
      {/* Target Handles */}
      <Handle type="target" position={Position.Top} id="t-top" className="opacity-0" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Right} id="t-right" className="opacity-0" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Bottom} id="t-bottom" className="opacity-0" isConnectable={isConnectable} />
      <Handle type="target" position={Position.Left} id="t-left" className="opacity-0" isConnectable={isConnectable} />

      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${iconBgClass} ${colorClass}`}>
          <span className="text-lg">{data.icon || (isActor ? '👤' : '⚙️')}</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-[10px] uppercase tracking-widest font-bold mb-0.5 ${colorClass}`}>
            {typeLabel}
          </span>
          <span className="text-sm font-medium text-txt-primary">
            {data.label}
          </span>
        </div>
      </div>

      {/* Source Handles */}
      <Handle type="source" position={Position.Top} id="s-top" className={`w-3 h-3 border-2 border-app-bg ${handleColorClass}`} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Right} id="s-right" className={`w-3 h-3 border-2 border-app-bg ${handleColorClass}`} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="s-bottom" className={`w-3 h-3 border-2 border-app-bg ${handleColorClass}`} isConnectable={isConnectable} />
      <Handle type="source" position={Position.Left} id="s-left" className={`w-3 h-3 border-2 border-app-bg ${handleColorClass}`} isConnectable={isConnectable} />
    </div>
  );
}
