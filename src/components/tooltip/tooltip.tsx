import { TTooltipData } from "../../types/plot.type";

export default function Tooltip({ tooltip }: { tooltip: TTooltipData }) {
  return (
    <div className="min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-1 font-semibold text-slate-900 dark:text-slate-100">
        {tooltip.date}
      </div>
      <ul className="space-y-1">
        {tooltip.values.map((v) => (
          <li key={v.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: v.color }}
            />
            <span className="text-slate-600 dark:text-slate-300">
              {v.label}
            </span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-slate-900 dark:text-slate-100">
              {v.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
