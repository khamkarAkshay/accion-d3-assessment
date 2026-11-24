import type { ReactNode } from "react";

/* Shared ------------------------------------------------------------------ */

export type TTooltipData = {
  x: number;
  y: number;
  date: string;
  values: {
    label: string;
    value: number | string;
    color: string;
  }[];
};

/* DonutChart -------------------------------------------------------------- */

export type TDonutChartProps<T> = {
  data: T[];
  getLabel: (d: T) => string;
  getValue: (d: T) => number;
  getColor?: (d: T, index: number) => string;

  title?: string;
  /** Text shown in the middle of the donut. */
  centerLabel?: string;

  /** Inner radius as a fraction of the outer radius. 0 = pie. */
  innerRadiusRatio?: number;
  /** Gap between slices, in radians. */
  padAngle?: number;
  cornerRadius?: number;
  /** Space reserved around the ring for outside labels (viewBox units). */
  labelMargin?: number;
  /** Hide the % inside a slice when its share (0–1) is below this. */
  minPercentToLabel?: number;
  showLabels?: boolean;
  showPercentages?: boolean;

  formatValue?: (value: number) => string;
  formatPercent?: (fraction: number) => string;

  /** Tooltip heading (TooltipData.date). Defaults to the slice label. */
  getTooltipTitle?: (d: T) => string;
  renderTooltip?: (tooltip: TTooltipData) => ReactNode;

  className?: string;
};

/* TreeChart --------------------------------------------------------------- */

export type TTreeNodeContext = {
  id: string;
  depth: number;
  /** Depth-first index in the full tree (stable when collapsing). */
  index: number;
  /** Labels from the root down to this node. */
  path: string[];
  childCount: number;
};

export type TTreeChartProps<T> = {
  /** Root node. */
  data: T;
  getChildren: (d: T) => T[] | undefined;
  getLabel: (d: T) => string;
  getColor?: (d: T, ctx: TTreeNodeContext) => string;

  title?: string;
  /** Levels below the root that start expanded. Infinity = all. */
  defaultExpandedDepth?: number;
  showControls?: boolean;

  columnWidth?: number;
  rowHeight?: number;
  /** Vertical gap multiplier between different parents' children. */
  groupGap?: number;
  /** Room on the right for the deepest labels. */
  labelSpace?: number;
  rootRadius?: number;
  nodeRadius?: number;
  linkShape?: "straight" | "curve";
  animationMs?: number;
  onNodeClick?: (d: T, ctx: TTreeNodeContext) => void;

  className?: string;
};

/* ScatterChart ------------------------------------------------------------ */

export type TScatterChartProps<T> = {
  data: T[];
  getX: (d: T) => number;
  getY: (d: T) => number;
  /** Series key. Omit for a single series (legend is hidden). */
  getGroup?: (d: T) => string;
  getColor?: (group: string, index: number) => string;

  title?: string;
  xLabel?: string;
  yLabel?: string;
  legendTitle?: string;

  height?: number;
  pointRadius?: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
  /** Padding around the data extent, as a fraction of the range. */
  domainPadding?: number;
  showGrid?: boolean;

  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  onPointClick?: (d: T) => void;

  className?: string;
};

/* LineChart --------------------------------------------------------------- */

export type TLineChartProps<T> = {
  data: T[];
  /** Category on the x axis (e.g. "2025-01"). Order of first appearance is kept. */
  getX: (d: T) => string;
  getY: (d: T) => number;
  /** Series key. Omit for a single line (legend is hidden). */
  getGroup?: (d: T) => string;
  getColor?: (group: string, index: number) => string;

  title?: string;
  xLabel?: string;
  yLabel?: string;
  legendTitle?: string;

  height?: number;
  yDomain?: [number, number];
  /** Padding around the data extent, as a fraction of the range. */
  domainPadding?: number;
  curve?: "linear" | "monotone";
  /** Light fill under each line. Defaults to true for a single series. */
  showArea?: boolean;
  showPoints?: boolean;
  showGrid?: boolean;
  rotateXLabels?: boolean;

  formatX?: (x: string) => string;
  formatY?: (v: number) => string;

  renderTooltip?: (tooltip: TTooltipData) => ReactNode;
  className?: string;
};

/* BarChart ---------------------------------------------------------------- */

export type TBarChartProps<T> = {
  data: T[];
  getX: (d: T) => string;
  getY: (d: T) => number;
  getColor?: (d: T, index: number) => string;

  title?: string;
  xLabel?: string;
  yLabel?: string;

  height?: number;
  /** Gap between bars as a fraction of the band (0–1). */
  barPadding?: number;
  /** Print each bar's value above it. */
  showValues?: boolean;
  showGrid?: boolean;
  rotateXLabels?: boolean;
  /** Defaults to [min(0, min), max]. */
  yDomain?: [number, number];

  formatY?: (v: number) => string;
  onBarClick?: (d: T) => void;
  className?: string;
};
