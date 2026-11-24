import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { TBarChartProps, TTooltipData } from "../../types/plot.type";
import Tooltip from "../tooltip/tooltip";

type BarDatum<T> = { d: T; i: number; x: string; y: number; color: string };

export default function BarChart<T>({
  data,
  getX,
  getY,
  getColor,
  title,
  xLabel,
  yLabel,
  height = 420,
  barPadding = 0.15,
  showValues = true,
  showGrid = true,
  rotateXLabels = true,
  yDomain,
  formatY,
  onBarClick,
  className = "",
}: TBarChartProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [tooltip, setTooltip] = useState<TTooltipData | null>(null);
  const margin = {
    top: 20,
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

  const bars = useMemo<BarDatum<T>[]>(
    () =>
      data.map((d, i) => ({
        d,
        i,
        x: getX(d),
        y: getY(d),
        color:
          getColor?.(d, i) ??
          d3.schemeCategory10[i % d3.schemeCategory10.length],
      })),
    [data, getX, getY, getColor],
  );

  const xScale = useMemo(
    () =>
      d3
        .scaleBand<string>()
        .domain(bars.map((b) => b.x))
        .range([0, innerW])
        .padding(barPadding),
    [bars, innerW, barPadding],
  );
  const yScale = useMemo(() => {
    const [lo = 0, hi = 0] = d3.extent(bars, (b) => b.y);
    return d3
      .scaleLinear()
      .domain(yDomain ?? [Math.min(0, lo), Math.max(0, hi) || 1])
      .nice()
      .range([innerH, 0]);
  }, [bars, yDomain, innerH]);
  const zero = yScale(0);
  const yTicks = useMemo(
    () => yScale.ticks(Math.max(2, Math.floor(innerH / 50))),
    [yScale, innerH],
  );

  const fyTick = useMemo(
    () => formatY ?? yScale.tickFormat(yTicks.length),
    [formatY, yScale, yTicks.length],
  );

  const fyValue = useMemo(() => formatY ?? d3.format(","), [formatY]);

  const step = Math.max(1, Math.ceil(bars.length / 12));

  const labelled = useMemo(
    () => bars.filter((_, i) => i % step === 0),
    [bars, step],
  );
  const center = (x: string) => (xScale(x) ?? 0) + xScale.bandwidth() / 2;

  const showTip = (b: BarDatum<T>) => {
    setTooltip({
      x: margin.left + center(b.x),
      y: margin.top + Math.min(yScale(b.y), zero),
      date: b.x,
      values: [
        { label: yLabel ?? "Value", value: fyValue(b.y), color: b.color },
      ],
    });
  };
  const clear = () => {
    setTooltip(null);
  };

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
        .data(labelled)
        .join("line")
        .attr("class", "x-grid")
        .attr("x1", (d) => center(d.x))
        .attr("x2", (d) => center(d.x))
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
    const barSelection = chart
      .selectAll<SVGRectElement, BarDatum<T>>("rect.bar")
      .data(bars, (d) => String(d.i))
      .join("rect")
      .attr("class", "bar outline-none")
      .attr("x", (d) => xScale(d.x) ?? 0)
      .attr("width", xScale.bandwidth())
      .attr("fill", (d) => d.color)
      .attr("y", zero)
      .attr("height", 0)
      .attr("tabindex", 0)
      .attr("role", "graphics-symbol")
      .attr("focusable", "true")
      .attr("aria-label", (d) => `${d.x}: ${d.y}`)
      .style("cursor", onBarClick ? "pointer" : "default")
      .on("mouseenter mousemove", (_event, d) => showTip(d))
      .on("mouseleave", clear)
      .on("focus", (_event, d) => showTip(d))
      .on("blur", clear)
      .on("click", (_event, d) => onBarClick?.(d.d))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onBarClick?.(d.d);
        }
      });
    barSelection
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr("y", (d) => Math.min(yScale(d.y), zero))
      .attr("height", (d) => Math.abs(zero - yScale(d.y)));

    if (showValues)
      chart
        .selectAll<SVGTextElement, BarDatum<T>>("text.bar-value")
        .data(bars)
        .join("text")
        .attr(
          "class",
          "bar-value pointer-events-none fill-slate-900 text-[11px] dark:fill-slate-200",
        )
        .attr("x", (d) => center(d.x))
        .attr("y", (d) => {
          const top = Math.min(yScale(d.y), zero);
          const h = Math.abs(zero - yScale(d.y));
          return d.y >= 0 ? top - 6 : top + h + 14;
        })
        .attr("text-anchor", "middle")
        .text((d) => fyValue(d.y));

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
      .data(labelled)
      .join("line")
      .attr("class", "x-tick")
      .attr("x1", (d) => center(d.x))
      .attr("x2", (d) => center(d.x))
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
      .selectAll<SVGTextElement, BarDatum<T>>("text.x-label")
      .data(labelled)
      .join("text")
      .attr("class", "x-label")
      .attr("x", (d) => center(d.x))
      .attr("y", (d) => innerH + (rotateXLabels ? 16 : 20))
      .attr("text-anchor", rotateXLabels ? "end" : "middle")
      .attr("transform", (d) =>
        rotateXLabels ? `rotate(-35 ${center(d.x)} ${innerH + 16})` : null,
      )
      .text((d) => d.x);
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
    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [
    bars,
    width,
    height,
    innerW,
    innerH,
    xScale,
    yScale,
    zero,
    yTicks,
    labelled,
    margin.left,
    margin.top,
    rotateXLabels,
    showGrid,
    showValues,
    xLabel,
    yLabel,
    fyTick,
    fyValue,
    onBarClick,
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
      <div ref={wrapRef} className="relative w-full">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          role="img"
          aria-label={title ?? "Bar chart"}
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
                  ? "translate(calc(-100% - 14px), -110%)"
                  : "translate(14px, -110%)",
            }}
          >
            <Tooltip tooltip={tooltip} />
          </div>
        )}
      </div>
    </div>
  );
}
