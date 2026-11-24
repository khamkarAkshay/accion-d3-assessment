import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import * as d3 from "d3";
import type {
  TTreeNodeContext,
  TTreeChartProps,
  TTooltipData,
} from "../../types/plot.type";
import Tooltip from "../tooltip/tooltip";

type Pos = { x: number; y: number };
type Internal<T> = {
  id: string;
  data: T;
  index: number;
  children?: Internal<T>[];
};
type LayoutNode<T> = Pos & {
  id: string;
  data: T;
  ctx: TTreeNodeContext;
  parentId?: string;
  color: string;
  hasChildren: boolean;
  isCollapsed: boolean;
};
function useAnimatedPositions(
  targets: Map<string, Pos>,
  parentOf: Map<string, string | undefined>,
  duration: number,
) {
  const [current, setCurrent] = useState(targets);
  const currentRef = useRef(targets);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || duration <= 0) {
      currentRef.current = targets;
      setCurrent(targets);
      return;
    }
    const from = new Map<string, Pos>();
    targets.forEach((t, id) => {
      let p = currentRef.current.get(id);
      let pid = parentOf.get(id);
      while (!p && pid) {
        p = currentRef.current.get(pid);
        pid = parentOf.get(pid);
      }
      from.set(id, p ?? t);
    });
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      const e = d3.easeCubicInOut(k);
      const next = new Map<string, Pos>();
      targets.forEach((t, id) => {
        const f = from.get(id)!;
        next.set(id, { x: f.x + (t.x - f.x) * e, y: f.y + (t.y - f.y) * e });
      });
      currentRef.current = next;
      setCurrent(next);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targets, parentOf, duration]);
  return current;
}
const MARGIN = { top: 24, right: 16, bottom: 24, left: 40 };
export function TreeChart<T>({
  data,
  getChildren,
  getLabel,
  getColor,
  title,
  defaultExpandedDepth = Infinity,
  showControls = true,
  columnWidth = 300,
  rowHeight = 44,
  groupGap = 2.5,
  labelSpace = 190,
  rootRadius = 9,
  nodeRadius = 7,
  linkShape = "straight",
  animationMs = 300,
  onNodeClick,
  className = "",
}: TTreeChartProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TTooltipData | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const tree = useMemo(() => {
    let counter = 0;
    const build = (d: T, id: string): Internal<T> => {
      const index = counter++;
      const kids = getChildren(d);
      return {
        id,
        data: d,
        index,
        children: kids?.length
          ? kids.map((c, i) => build(c, `${id}.${i}`))
          : undefined,
      };
    };
    return build(data, "0");
  }, [data, getChildren]);
  const fullDepth = useMemo(() => {
    const walk = (n: Internal<T>): number =>
      n.children ? 1 + Math.max(...n.children.map(walk)) : 0;
    return walk(tree);
  }, [tree]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const s = new Set<string>();
    const walk = (n: Internal<T>, depth: number) => {
      if (!n.children) return;
      if (depth >= defaultExpandedDepth) s.add(n.id);
      n.children.forEach((c) => walk(c, depth + 1));
    };
    walk(tree, 0);
    return s;
  });
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const s = new Set<string>();
    const walk = (n: Internal<T>) => {
      if (n.children && n.id !== tree.id) s.add(n.id);
      n.children?.forEach(walk);
    };
    walk(tree);
    setCollapsed(s);
  };
  const { nodes, width, height } = useMemo(() => {
    const root = d3.hierarchy<Internal<T>>(tree, (n) =>
      collapsed.has(n.id) ? undefined : n.children,
    );
    d3
      .tree<Internal<T>>()
      .nodeSize([rowHeight, columnWidth])
      .separation((a, b) => (a.parent === b.parent ? 1 : groupGap))(root);
    const all = root.descendants();
    const minX = d3.min(all, (n) => n.x ?? 0) ?? 0;
    const maxX = d3.max(all, (n) => n.x ?? 0) ?? 0;
    const laid: LayoutNode<T>[] = all.map((n) => {
      const path = n
        .ancestors()
        .reverse()
        .map((a) => getLabel(a.data.data));
      const childCount = n.data.children?.length ?? 0;
      const ctx: TTreeNodeContext = {
        id: n.data.id,
        depth: n.depth,
        index: n.data.index,
        path,
        childCount,
      };
      return {
        id: n.data.id,
        data: n.data.data,
        ctx,
        parentId: n.parent?.data.id,
        x: MARGIN.left + (n.y ?? 0),
        y: MARGIN.top + ((n.x ?? 0) - minX),
        color:
          getColor?.(n.data.data, ctx) ??
          d3.schemeCategory10[n.data.index % d3.schemeCategory10.length],
        hasChildren: childCount > 0,
        isCollapsed: collapsed.has(n.data.id),
      };
    });
    return {
      nodes: laid,
      width: MARGIN.left + fullDepth * columnWidth + labelSpace + MARGIN.right,
      height: MARGIN.top + (maxX - minX) + MARGIN.bottom,
    };
  }, [
    tree,
    collapsed,
    rowHeight,
    columnWidth,
    groupGap,
    labelSpace,
    fullDepth,
    getLabel,
    getColor,
  ]);
  const targets = useMemo(
    () => new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }])),
    [nodes],
  );
  const parentOf = useMemo(
    () => new Map(nodes.map((n) => [n.id, n.parentId])),
    [nodes],
  );
  const positions = useAnimatedPositions(targets, parentOf, animationMs);
  const posOf = (id: string): Pos => positions.get(id) ?? targets.get(id)!;
  const curve = useMemo(
    () =>
      d3
        .linkHorizontal<{ source: Pos; target: Pos }, Pos>()
        .x((d) => d.x)
        .y((d) => d.y),
    [],
  );
  const showTip = (
    event: MouseEvent | globalThis.MouseEvent,
    n: LayoutNode<T>,
  ) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setContainerWidth(rect.width);
    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      date: getLabel(n.data),
      values: [
        { label: "Path", value: n.ctx.path.join(" › "), color: n.color },
        ...(n.ctx.childCount > 0
          ? [{ label: "Children", value: n.ctx.childCount, color: n.color }]
          : []),
      ],
    });
  };
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const linkData = nodes.filter((n) => n.parentId);
    svg
      .append("g")
      .attr("class", "tree-links")
      .attr("fill", "none")
      .attr("stroke-width", 1.75)
      .attr("stroke-linecap", "round")
      .selectAll<SVGPathElement, LayoutNode<T>>("path")
      .data(linkData, (d) => d.id)
      .join("path")
      .attr("d", (n) => {
        const s = posOf(n.parentId!),
          t = posOf(n.id);
        return linkShape === "curve"
          ? (curve({ source: s, target: t }) ?? "")
          : `M${s.x},${s.y}L${t.x},${t.y}`;
      })
      .attr("stroke", (n) => n.color)
      .attr("stroke-opacity", 0.5);
    const groups = svg
      .append("g")
      .attr("class", "tree-nodes")
      .selectAll<SVGGElement, LayoutNode<T>>("g.node")
      .data(nodes, (d) => d.id)
      .join("g")
      .attr(
        "class",
        (n) => `node ${n.hasChildren ? "cursor-pointer" : "cursor-default"}`,
      )
      .attr("transform", (n) => {
        const p = posOf(n.id);
        return `translate(${p.x},${p.y})`;
      })
      .attr("role", "treeitem")
      .attr("aria-expanded", (n) =>
        n.hasChildren ? String(!n.isCollapsed) : null,
      )
      .attr("aria-label", (n) => getLabel(n.data))
      .attr("tabindex", (n) => (n.hasChildren ? 0 : -1))
      .on("click", (_e, n) => {
        if (n.hasChildren) toggle(n.id);
        onNodeClick?.(n.data, n.ctx);
      })
      .on("keydown", (event, n) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (n.hasChildren) {
            toggle(n.id);
            onNodeClick?.(n.data, n.ctx);
          }
        }
      })
      .on("mouseenter mousemove", (event, n) =>
        showTip(event as globalThis.MouseEvent, n),
      )
      .on("mouseleave", () => setTooltip(null));
    groups
      .filter((n) => n.isCollapsed)
      .append("circle")
      .attr("class", "collapsed-halo")
      .attr("r", (n) => (n.ctx.depth === 0 ? rootRadius : nodeRadius) + 4)
      .attr("fill", "none")
      .attr("stroke", (n) => n.color)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.55);
    groups
      .append("circle")
      .attr("class", "node-circle")
      .attr("r", (n) => (n.ctx.depth === 0 ? rootRadius : nodeRadius))
      .attr("fill", (n) => n.color)
      .attr("stroke", "transparent")
      .attr("stroke-width", 2);
    groups
      .append("text")
      .attr("x", (n) => (n.ctx.depth === 0 ? rootRadius : nodeRadius) + 8)
      .attr("dominant-baseline", "middle")
      .attr(
        "class",
        (n) =>
          `pointer-events-none fill-slate-900 stroke-white text-[15px] dark:fill-slate-100 dark:stroke-slate-900 ${n.ctx.depth === 0 ? "font-bold" : ""}`,
      )
      .style("paint-order", "stroke")
      .style("stroke-width", 4)
      .style("stroke-linejoin", "round")
      .text((n) => getLabel(n.data));
    groups
      .filter((n) => n.isCollapsed)
      .select("text")
      .append("tspan")
      .attr("dx", 6)
      .attr("class", "fill-slate-500 dark:fill-slate-400")
      .style("stroke-width", 4)
      .text((n) => `(${n.ctx.childCount})`);
    groups
      .on("focus", function () {
        d3.select(this)
          .select("circle.node-circle")
          .attr("stroke", "currentColor");
      })
      .on("blur", function () {
        d3.select(this)
          .select("circle.node-circle")
          .attr("stroke", "transparent");
      });
    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [
    nodes,
    positions,
    width,
    height,
    linkShape,
    curve,
    getLabel,
    onNodeClick,
  ]);
  return (
    <div
      className={`w-full ${className} border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm dark:bg-slate-800`}
    >
      {(title || showControls) && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
          )}
          {showControls && (
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={expandAll}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>
      )}
      <div ref={containerRef} className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[640px]"
          role="tree"
          aria-label={title ?? "Tree chart"}
        />
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
