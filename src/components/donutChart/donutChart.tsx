import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { TTooltipData, TDonutChartProps } from "../../types/plot.type";
import { DEFAULT_DONUT_COLORS } from "../../constants";
import Tooltip from "../tooltip/tooltip";

const VIEWBOX = 560;
type Slice<T> = { arc: d3.PieArcDatum<T>; color: string; index: number };

export function DonutChart<T>({
  data,
  getLabel,
  getValue,
  getColor,
  title,
  centerLabel,
  innerRadiusRatio = 0.6,
  padAngle = 0.004,
  cornerRadius = 0,
  labelMargin = 100,
  minPercentToLabel = 0.03,
  showLabels = true,
  showPercentages = true,
  formatPercent = d3.format(".0%"),
  className = "",
}: TDonutChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TTooltipData | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const outerRadius = VIEWBOX / 2 - labelMargin;
  const innerRadius = outerRadius * innerRadiusRatio;
  const center = VIEWBOX / 2;
  const total = useMemo(
    () => d3.sum(data, (d) => Math.max(0, getValue(d))),
    [data, getValue],
  );
  const slices = useMemo<Slice<T>[]>(
    () =>
      d3
        .pie<T>()
        .value((d) => Math.max(0, getValue(d)))
        .sort(null)
        .padAngle(padAngle)(data)
        .map((arc, index) => ({
          arc,
          index,
          color:
            getColor?.(arc.data, index) ??
            DEFAULT_DONUT_COLORS[index % DEFAULT_DONUT_COLORS.length],
        })),
    [data, getValue, getColor, padAngle],
  );
  const arcPath = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<T>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(cornerRadius),
    [innerRadius, outerRadius, cornerRadius],
  );
  const percentArc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<T>>()
        .innerRadius((innerRadius + outerRadius) / 2)
        .outerRadius((innerRadius + outerRadius) / 2),
    [innerRadius, outerRadius],
  );
  const labelArc = useMemo(
    () =>
      d3
        .arc<d3.PieArcDatum<T>>()
        .innerRadius(outerRadius + 16)
        .outerRadius(outerRadius + 16),
    [outerRadius],
  );
  const showTooltip = (index: number, x?: number, y?: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setContainerWidth(rect.width);
    const { arc, color } = slices[index];
    const value = getValue(arc.data);
    const share = total > 0 ? value / total : 0;
    const [cx, cy] = percentArc.centroid(arc);
    setActiveIndex(index);
    setTooltip({
      x: x ?? center + cx,
      y: y ?? center + cy,
      date: getLabel(arc.data),
      values: [
        { label: "Value", value, color },
        { label: "Percentage", value: formatPercent(share), color },
      ],
    });
  };
  const hideTooltip = () => {
    setActiveIndex(null);
    setTooltip(null);
  };

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const chart = svg
      .append("g")
      .attr("transform", `translate(${center},${center})`);
    const groups = chart
      .selectAll<SVGGElement, Slice<T>>("g.slice-group")
      .data(slices, (d) => String(d.index))
      .join("g")
      .attr("class", "slice-group")
      .attr("opacity", (d) =>
        activeIndex !== null && activeIndex !== d.index ? 0.4 : 1,
      );
    groups
      .append("path")
      .attr("class", "slice outline-none")
      .attr("d", (d) => arcPath(d.arc) ?? "")
      .attr("fill", (d) => d.color)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("tabindex", 0)
      .attr("role", "graphics-symbol")
      .attr("focusable", "true")
      .attr(
        "aria-label",
        (d) =>
          `${getLabel(d.arc.data)}: ${formatPercent(total > 0 ? getValue(d.arc.data) / total : 0)}`,
      )
      .style("cursor", "pointer")
      .on("mouseenter mousemove", (event, d) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        showTooltip(d.index, x, y);
      })
      .on("mouseleave", hideTooltip)
      .on("focus", (_event, d) => showTooltip(d.index))
      .on("blur", hideTooltip);
    if (showPercentages)
      groups
        .filter(
          (d) => total > 0 && getValue(d.arc.data) / total >= minPercentToLabel,
        )
        .append("text")
        .attr("x", (d) => percentArc.centroid(d.arc)[0])
        .attr("y", (d) => percentArc.centroid(d.arc)[1])
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("class", "pointer-events-none fill-slate-900 text-[17px]")
        .text((d) =>
          formatPercent(total > 0 ? getValue(d.arc.data) / total : 0),
        );
    if (showLabels)
      groups
        .append("text")
        .attr("x", (d) => labelArc.centroid(d.arc)[0])
        .attr("y", (d) => labelArc.centroid(d.arc)[1])
        .attr("text-anchor", (d) =>
          (d.arc.startAngle + d.arc.endAngle) / 2 < Math.PI ? "start" : "end",
        )
        .attr("dominant-baseline", "middle")
        .attr(
          "class",
          "pointer-events-none fill-slate-800 text-[18px] dark:fill-slate-200",
        )
        .text((d) => getLabel(d.arc.data));
    if (centerLabel)
      chart
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr(
          "class",
          "pointer-events-none fill-slate-900 text-[28px] font-bold dark:fill-slate-100",
        )
        .text(centerLabel);
    return () => {
      svg.selectAll("*").on(".tooltip", null);
    };
  }, [
    slices,
    center,
    arcPath,
    percentArc,
    labelArc,
    activeIndex,
    total,
    getLabel,
    getValue,
    formatPercent,
    showLabels,
    showPercentages,
    minPercentToLabel,
    centerLabel,
  ]);

  return (
    <div
      className={`w-full ${className} border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm dark:bg-slate-800`}
    >
      {title && (
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
      )}
      <div ref={containerRef} className="relative mx-auto w-full max-w-xl">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          className="h-auto w-full"
          role="img"
          aria-label={title ?? "Donut chart"}
        />
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-3">
          {slices.map(({ arc, color, index }) => (
            <div
              key={`${getLabel(arc.data)}-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-700 dark:text-slate-200">
                {getLabel(arc.data)}
              </span>
            </div>
          ))}
        </div>
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform:
                tooltip.x > containerWidth * 0.6
                  ? "translate(calc(-100% - 12px), 12px)"
                  : "translate(12px, 12px)",
            }}
          >
            <Tooltip tooltip={tooltip} />
          </div>
        )}
      </div>
    </div>
  );
}
