import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { TLineChartProps, TTooltipData } from "../../types/plot.type";
import Tooltip from "../tooltip/tooltip";

type LinePoint = { x: string; y: number };
type LineSeries = { name: string; color: string; points: LinePoint[] };

export default function LineChart<T>({
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
  yDomain,
  domainPadding = 0.1,
  curve = "linear",
  showArea,
  showPoints = true,
  showGrid = true,
  rotateXLabels = true,
  formatX = (x) => x,
  formatY,
  className = "",
}: TLineChartProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [legendHover, setLegendHover] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TTooltipData | null>(null);
  const margin = {
    top: 12,
    right: 24,
    bottom: rotateXLabels ? 86 : 54,
    left: 66,
  };
  const innerW = Math.max(0, width - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);
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
  const { xs, series } = useMemo(() => {
    const xList = Array.from(new Set(data.map(getX))).sort((a, b) => {
      const da = Date.parse(a),
        db = Date.parse(b);
      return Number.isNaN(da) || Number.isNaN(db)
        ? a.localeCompare(b)
        : da - db;
    });
    const order = new Map(xList.map((x, i) => [x, i]));
    const names = Array.from(new Set(data.map((d) => getGroup?.(d) ?? "")));
    return {
      xs: xList,
      series: names.map((name, i) => ({
        name,
        color:
          getColor?.(name, i) ??
          d3.schemeCategory10[i % d3.schemeCategory10.length],
        points: data
          .filter((d) => (getGroup?.(d) ?? "") === name)
          .map((d) => ({ x: getX(d), y: getY(d) }))
          .sort((a, b) => order.get(a.x)! - order.get(b.x)!),
      })),
    };
  }, [data, getX, getY, getGroup, getColor]);
  const parseDate = useMemo(() => d3.timeParse("%Y-%m-%d"), []);
  const parsedXs = useMemo(
    () =>
      xs
        .map((x) => ({ raw: x, date: parseDate(x) ?? new Date(x) }))
        .filter((d) => !Number.isNaN(+d.date)),
    [xs, parseDate],
  );
  const dateByRaw = useMemo(
    () => new Map(parsedXs.map((d) => [d.raw, d.date])),
    [parsedXs],
  );
  const xScale = useMemo(
    () =>
      d3
        .scaleTime()
        .domain(d3.extent(parsedXs, (d) => d.date) as [Date, Date])
        .range([0, innerW]),
    [parsedXs, innerW],
  );
  const yScale = useMemo(() => {
    const [lo = 0, hi = 1] = d3.extent(
      series.flatMap((s) => s.points.map((p) => p.y)),
    );
    const pad = (hi - lo || 1) * domainPadding;
    return d3
      .scaleLinear()
      .domain(yDomain ?? [lo - pad, hi + pad])
      .range([innerH, 0]);
  }, [series, yDomain, domainPadding, innerH]);
  const xAt = (x: string) => {
    const date = dateByRaw.get(x);
    return date ? xScale(date) : 0;
  };
  const curveFn = curve === "monotone" ? d3.curveMonotoneX : d3.curveLinear;
  const yTicks = yScale.ticks(Math.max(2, Math.floor(innerH / 50)));
  const fyTick = formatY ?? yScale.tickFormat(yTicks.length);
  const fyValue = formatY ?? d3.format(",");
  const xTickDates = xScale.ticks(
    Math.max(2, Math.floor(innerW / (rotateXLabels ? 70 : 90))),
  );
  const visibleSeries = series.filter((s) => !hidden.has(s.name));
  const fillArea = showArea ?? series.length === 1;
  const showLegend = !!getGroup && series.length > 0;
  const nearestRaw = (date: Date) =>
    parsedXs.reduce(
      (best, p) =>
        Math.abs(+p.date - +date) < Math.abs(+best.date - +date) ? p : best,
      parsedXs[0],
    )?.raw;
  const showAt = (raw: string, y: number) => {
    const x = xAt(raw);
    setTooltip({
      x: margin.left + x,
      y: margin.top + y,
      date: formatX(raw),
      values: visibleSeries.flatMap((s) => {
        const p = s.points.find((pt) => pt.x === raw);
        return p
          ? [
              {
                label: s.name || yLabel || "Value",
                value: fyValue(p.y),
                color: s.color,
              },
            ]
          : [];
      }),
    });
  };
  const toggleSeries = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    if (showGrid) {
      const grid = chart
        .append("g")
        .attr("class", "stroke-slate-200 dark:stroke-slate-700");
      grid
        .selectAll("line.x-grid")
        .data(xTickDates)
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
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", (d) => yScale(d))
        .attr("y2", (d) => yScale(d));
    }
    const line = d3
      .line<LinePoint>()
      .x((p) => xAt(p.x))
      .y((p) => yScale(p.y))
      .curve(curveFn);
    const area = d3
      .area<LinePoint>()
      .x((p) => xAt(p.x))
      .y0(innerH)
      .y1((p) => yScale(p.y))
      .curve(curveFn);
    const groups = chart
      .selectAll<SVGGElement, LineSeries>("g.series")
      .data(visibleSeries, (d) => d.name)
      .join("g")
      .attr("class", "series")
      .attr("opacity", (s) =>
        legendHover !== null && legendHover !== s.name ? 0.2 : 1,
      );
    if (fillArea)
      groups
        .append("path")
        .attr("class", "series-area")
        .attr("d", (s) => area(s.points) ?? "")
        .attr("fill", (s) => s.color)
        .attr("fill-opacity", 0.12);
    groups
      .append("path")
      .attr("class", "series-line")
      .attr("d", (s) => line(s.points) ?? "")
      .attr("fill", "none")
      .attr("stroke", (s) => s.color)
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round");
    if (showPoints)
      groups
        .selectAll<SVGCircleElement, LinePoint>("circle.point")
        .data((s) =>
          s.points.map((p) => ({
            ...p,
            seriesName: s.name,
            seriesColor: s.color,
          })),
        )
        .join("circle")
        .attr("class", "point outline-none")
        .attr("cx", (p) => xAt(p.x))
        .attr("cy", (p) => yScale(p.y))
        .attr("r", 4)
        .attr("fill", (p) => p.seriesColor)
        .attr("tabindex", 0)
        .attr("role", "graphics-symbol")
        .attr("focusable", "true")
        .attr("aria-label", (p) => `${formatX(p.x)}: ${p.y}`)
        .on("focus", (_event, p) => showAt(p.x, yScale(p.y)))
        .on("blur", () => {
          setTooltip(null);
        });
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
      .data(xTickDates)
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
      .attr("x1", -5)
      .attr("x2", 0)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d));
    const labels = chart
      .append("g")
      .attr("class", "fill-slate-900 text-xs dark:fill-slate-200");
    labels
      .selectAll<SVGTextElement, Date>("text.x-label")
      .data(xTickDates)
      .join("text")
      .attr("class", "x-label")
      .attr("x", (d) => xScale(d))
      .attr("y", (_) => innerH + (rotateXLabels ? 16 : 20))
      .attr("text-anchor", rotateXLabels ? "end" : "middle")
      .attr("transform", (d) =>
        rotateXLabels ? `rotate(-35 ${xScale(d)} ${innerH + 16})` : null,
      )
      .text((d) => formatX(d3.timeFormat("%Y-%m-%d")(d)));
    labels
      .selectAll<SVGTextElement, number>("text.y-label")
      .data(yTicks)
      .join("text")
      .attr("class", "y-label")
      .attr("x", -10)
      .attr("y", (d) => yScale(d))
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text(fyTick);
    if (xLabel)
      chart
        .append("text")
        .attr("x", innerW / 2)
        .attr("y", innerH + (rotateXLabels ? 72 : 44))
        .attr("text-anchor", "middle")
        .attr("class", "fill-slate-800 text-[13px] dark:fill-slate-200")
        .text(xLabel);
    if (yLabel)
      chart
        .append("text")
        .attr(
          "transform",
          `translate(${-margin.left + 16},${innerH / 2}) rotate(-90)`,
        )
        .attr("text-anchor", "middle")
        .attr("class", "fill-slate-800 text-[13px] dark:fill-slate-200")
        .text(yLabel);
    svg
      .on("mousemove", (event: MouseEvent) => {
        const [mx, my] = d3.pointer(event, svg.node());
        const x = mx - margin.left,
          y = my - margin.top;
        if (!parsedXs.length || x < 0 || x > innerW || y < 0 || y > innerH) {
          setTooltip(null);
          return;
        }
        const date = xScale.invert(x);
        const raw = nearestRaw(date);
        if (raw) showAt(raw, y);
      })
      .on("mouseleave", () => {
        setTooltip(null);
      });
    return () => {
      svg.on("mousemove", null).on("mouseleave", null);
    };
  }, [
    visibleSeries,
    series,
    width,
    height,
    innerW,
    innerH,
    xScale,
    yScale,
    xTickDates,
    yTicks,
    showGrid,
    showPoints,
    fillArea,
    curveFn,
    legendHover,
    formatX,
    fyTick,
    xLabel,
    yLabel,
    rotateXLabels,
    margin.left,
    margin.top,
    parsedXs,
    dateByRaw,
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
            {series.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  aria-pressed={!hidden.has(s.name)}
                  onClick={() => toggleSeries(s.name)}
                  onMouseEnter={() => setLegendHover(s.name)}
                  onMouseLeave={() => setLegendHover(null)}
                  onFocus={() => setLegendHover(s.name)}
                  onBlur={() => setLegendHover(null)}
                  className={`flex items-center gap-2 rounded text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:text-slate-100 ${hidden.has(s.name) ? "opacity-40" : ""}`}
                >
                  <span
                    className="inline-block h-1 w-4 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
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
          aria-label={title ?? "Line chart"}
          className="block"
        />
        {tooltip && tooltip.values.length > 0 && (
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
