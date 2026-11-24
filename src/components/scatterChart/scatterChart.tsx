import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { TScatterChartProps, TTooltipData } from "../../types/plot.type";
import Tooltip from "../tooltip/tooltip";

type Point<T> = {
  d: T;
  i: number;
  x: number;
  y: number;
  group: string;
  color: string;
};
const MARGIN = { top: 12, right: 24, bottom: 54, left: 66 };
const HIT_RADIUS = 28;
export function ScatterChart<T>({
  data,
  getX,
  getY,
  getGroup,
  getColor,
  title,
  xLabel,
  yLabel,
  legendTitle,
  height = 420,
  pointRadius = 5,
  xDomain,
  yDomain,
  domainPadding = 0.05,
  showGrid = true,
  formatX,
  formatY,
  onPointClick,
  className = "",
}: TScatterChartProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [legendHover, setLegendHover] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TTooltipData | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(1, el.clientWidth));
    update();
    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.max(1, entry.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const { points, groups, colorOf } = useMemo(() => {
    const groupList = Array.from(new Set(data.map((d) => getGroup?.(d) ?? "")));
    const colors = new Map(
      groupList.map((g, i) => [
        g,
        getColor?.(g, i) ?? d3.schemeCategory10[i % d3.schemeCategory10.length],
      ]),
    );
    const pts: Point<T>[] = data.map((d, i) => {
      const group = getGroup?.(d) ?? "";
      return { d, i, x: getX(d), y: getY(d), group, color: colors.get(group)! };
    });
    return { points: pts, groups: groupList, colorOf: colors };
  }, [data, getX, getY, getGroup, getColor]);
  const { xScale, yScale } = useMemo(() => {
    const padded = (ext: [number | undefined, number | undefined]) => {
      const [lo0, hi0] = ext;
      const lo = lo0 ?? 0,
        hi = hi0 ?? 1;
      const pad = (hi - lo || 1) * domainPadding;
      return [lo - pad, hi + pad] as [number, number];
    };
    return {
      xScale: d3
        .scaleLinear()
        .domain(xDomain ?? padded(d3.extent(points, (p) => p.x)))
        .range([0, innerW]),
      yScale: d3
        .scaleLinear()
        .domain(yDomain ?? padded(d3.extent(points, (p) => p.y)))
        .range([innerH, 0]),
    };
  }, [points, xDomain, yDomain, domainPadding, innerW, innerH]);
  const visible = useMemo(
    () => points.filter((p) => !hidden.has(p.group)),
    [points, hidden],
  );
  const delaunay = useMemo(
    () =>
      visible.length
        ? d3.Delaunay.from(
            visible,
            (p) => xScale(p.x),
            (p) => yScale(p.y),
          )
        : null,
    [visible, xScale, yScale],
  );
  const xTicks = xScale.ticks(Math.max(2, Math.floor(innerW / 80)));
  const yTicks = yScale.ticks(Math.max(2, Math.floor(innerH / 50)));
  const fx = formatX ?? xScale.tickFormat(xTicks.length);
  const fy = formatY ?? yScale.tickFormat(yTicks.length);
  const showTip = (p: Point<T>) => {
    setActiveIndex(p.i);
    setTooltip({
      x: MARGIN.left + xScale(p.x),
      y: MARGIN.top + yScale(p.y),
      date: p.group,
      values: [
        { label: xLabel ?? "x", value: fx(p.x), color: p.color },
        { label: yLabel ?? "y", value: fy(p.y), color: p.color },
      ],
    });
  };
  const clear = () => {
    setActiveIndex(null);
    setTooltip(null);
  };
  const toggleGroup = (g: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  const showLegend = !!getGroup && groups.length > 0;
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const chart = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
    if (showGrid) {
      const grid = chart
        .append("g")
        .attr("class", "stroke-slate-200 dark:stroke-slate-700");
      grid
        .selectAll("line.x-grid")
        .data(xTicks)
        .join("line")
        .attr("class", "x-grid")
        .attr("x1", (d) => xScale(d))
        .attr("x2", (d) => xScale(d))
        .attr("y1", 0)
        .attr("y2", innerH);
      grid
        .selectAll("line.y-grid")
        .data(yTicks)
        .join("line")
        .attr("class", "y-grid")
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d))
        .attr("x1", 0)
        .attr("x2", innerW);
    }
    const axes = chart
      .append("g")
      .attr("class", "stroke-slate-900 dark:stroke-slate-300");
    axes
      .append("line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", innerH);
    axes
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", innerH)
      .attr("y2", innerH);
    axes
      .selectAll("line.x-tick")
      .data(xTicks)
      .join("line")
      .attr("class", "x-tick")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", innerH)
      .attr("y2", innerH + 5);
    axes
      .selectAll("line.y-tick")
      .data(yTicks)
      .join("line")
      .attr("class", "y-tick")
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("x1", -5)
      .attr("x2", 0);
    const labels = chart
      .append("g")
      .attr("class", "fill-slate-900 text-xs dark:fill-slate-200");
    labels
      .selectAll<SVGTextElement, number>("text.x-label")
      .data(xTicks)
      .join("text")
      .attr("class", "x-label")
      .attr("x", (d) => xScale(d))
      .attr("y", innerH + 20)
      .attr("text-anchor", "middle")
      .text(fx);
    labels
      .selectAll<SVGTextElement, number>("text.y-label")
      .data(yTicks)
      .join("text")
      .attr("class", "y-label")
      .attr("x", -10)
      .attr("y", (d) => yScale(d))
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text(fy);
    if (xLabel)
      chart
        .append("text")
        .attr("x", innerW / 2)
        .attr("y", innerH + 44)
        .attr("text-anchor", "middle")
        .attr("class", "fill-slate-800 text-[13px] dark:fill-slate-200")
        .text(xLabel);
    if (yLabel)
      chart
        .append("text")
        .attr(
          "transform",
          `translate(${-MARGIN.left + 16},${innerH / 2}) rotate(-90)`,
        )
        .attr("text-anchor", "middle")
        .attr("class", "fill-slate-800 text-[13px] dark:fill-slate-200")
        .text(yLabel);
    chart
      .selectAll<SVGCircleElement, Point<T>>("circle.point")
      .data(visible, (d) => String(d.i))
      .join("circle")
      .attr("class", "point outline-none")
      .attr("cx", (p) => xScale(p.x))
      .attr("cy", (p) => yScale(p.y))
      .attr("r", (p) => (activeIndex === p.i ? pointRadius + 2 : pointRadius))
      .attr("fill", (p) => p.color)
      .attr("fill-opacity", (p) =>
        legendHover !== null && legendHover !== p.group ? 0.15 : 0.9,
      )
      .attr("stroke", (p) => (activeIndex === p.i ? p.color : "none"))
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", (p) => (activeIndex === p.i ? 5 : 0))
      .attr("tabindex", 0)
      .attr("role", "graphics-symbol")
      .attr("focusable", "true")
      .attr(
        "aria-label",
        (p) => `${p.group || "Point"}: ${fx(p.x)}, ${fy(p.y)}`,
      )
      .style("cursor", onPointClick ? "pointer" : "default")
      .on("mouseenter mousemove", (_e, p) => showTip(p))
      .on("mouseleave", clear)
      .on("focus", (_e, p) => showTip(p))
      .on("blur", clear)
      .on("click", (_e, p) => onPointClick?.(p.d))
      .on("keydown", (event, p) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPointClick?.(p.d);
        }
      });
    svg
      .on("mousemove", (event: MouseEvent) => {
        if (!delaunay) return;
        const [mx0, my0] = d3.pointer(event, svg.node());
        const mx = mx0 - MARGIN.left,
          my = my0 - MARGIN.top;
        const idx = delaunay.find(mx, my);
        const p = visible[idx];
        if (!p || Math.hypot(xScale(p.x) - mx, yScale(p.y) - my) > HIT_RADIUS) {
          clear();
          return;
        }
        showTip(p);
      })
      .on("mouseleave", clear);
    return () => {
      svg.on("mousemove", null).on("mouseleave", null);
    };
  }, [
    visible,
    groups,
    width,
    height,
    innerW,
    innerH,
    xScale,
    yScale,
    xTicks,
    yTicks,
    fx,
    fy,
    showGrid,
    pointRadius,
    activeIndex,
    legendHover,
    onPointClick,
    xLabel,
    yLabel,
    delaunay,
  ]);
  return (
    <div
      className={`w-full ${className} border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm dark:bg-slate-800`}
    >
      {title && (
        <h2 className="mb-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
      )}
      {showLegend && (
        <div className="mb-2">
          {legendTitle && (
            <div className="mb-1 text-sm text-slate-700 dark:text-slate-300">
              {legendTitle}
            </div>
          )}
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {groups.map((g) => (
              <li key={g}>
                <button
                  type="button"
                  aria-pressed={!hidden.has(g)}
                  onClick={() => toggleGroup(g)}
                  onMouseEnter={() => setLegendHover(g)}
                  onMouseLeave={() => setLegendHover(null)}
                  onFocus={() => setLegendHover(g)}
                  onBlur={() => setLegendHover(null)}
                  className={`flex items-center gap-2 rounded text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:text-slate-100 ${hidden.has(g) ? "opacity-40" : ""}`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: colorOf.get(g) }}
                  />
                  {g}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div ref={wrapRef} className="relative w-full">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          role="img"
          aria-label={title ?? "Scatter plot"}
          className="block"
        />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform:
                tooltip.x > width * 0.6
                  ? "translate(calc(-100% - 14px), -50%)"
                  : "translate(14px, -50%)",
            }}
          >
            <Tooltip tooltip={tooltip} />
          </div>
        )}
      </div>
    </div>
  );
}
