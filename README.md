# React + D3.js Data Visualization Assessment

A single-page dashboard of five reusable, generic chart components built with **React**, **TypeScript** and **D3.js**, styled with **Tailwind CSS** and bundled with **Vite**.

D3 is used for scales, layouts, shapes and axes, while React owns the DOM (charts render as SVG through JSX). Each chart is generic over its data type, so you pass in your own array plus small accessor functions (`getX`, `getY`, ...) instead of reshaping data to fit the chart.

## Charts

| Chart   | Component      | What it shows                 | Highlights                                                                                                         |
| ------- | -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Line    | `LineChart`    | Monthly revenue trend         | Multi-series support, linear or monotone curve, area fill, shared hover tooltip, clickable legend to toggle series |
| Bar     | `BarChart`     | Sales by product category     | Optional value labels, bar click callback, hover highlight, rotated x labels                                       |
| Donut   | `DonutChart`   | Website traffic sources       | Configurable inner radius (0 gives a pie), pad angle, outside labels, percentage labels, custom tooltip            |
| Tree    | `TreeChart`    | Company structure             | Expand/collapse nodes, animated layout, straight or curved links, expand/collapse controls, ARIA `tree` roles      |
| Scatter | `ScatterChart` | Advertising spend vs. revenue | Grouped series coloured by channel, legend toggle and hover highlight, custom domains, point click callback        |

All charts are responsive (they resize with their container via `ResizeObserver`), include `role` and `aria-label` attributes, and share a common `Tooltip` component with light and dark styles.

## Getting started

### Prerequisites

- Node.js (a current LTS release or newer)
- npm

### Install and run

```bash
npm install
npm run dev
```

Vite prints a local URL (by default `http://localhost:5173`).

### Scripts

| Command           | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR                             |
| `npm run build`   | Type-check (`tsc -b`) and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally                             |
| `npm run lint`    | Run ESLint                                                     |

## Project structure

```
.
├── public/                     # Static assets (favicon, icons)
├── src/
│   ├── components/
│   │   ├── barChart/           # BarChart
│   │   ├── donutChart/         # DonutChart
│   │   ├── lineChart/          # LineChart
│   │   ├── scatterChart/       # ScatterChart
│   │   ├── treeChart/          # TreeChart
│   │   └── tooltip/            # Shared tooltip UI
│   ├── dataset/                # Sample JSON data for each chart
│   ├── types/
│   │   ├── dataset.type.ts     # Types for the sample datasets
│   │   └── plot.type.ts        # Props types for every chart
│   ├── App.tsx                 # Dashboard page that renders all charts
│   ├── constants.ts            # Default donut colour palette
│   ├── helpers.ts              # Small helpers (e.g. toYearMonth)
│   ├── index.css               # Tailwind entry
│   └── main.tsx                # React entry point
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── tsconfig*.json
```

## Usage

Every chart takes a `data` array and accessor functions. Types are inferred from the generic parameter. The examples below are the same ones used in `src/App.tsx`.

### Imports

```tsx
import LineChart from "./components/lineChart/lineChart";
import BarChart from "./components/barChart/barChart";
import { DonutChart } from "./components/donutChart/donutChart";
import { TreeChart } from "./components/treeChart/treeChart";
import { ScatterChart } from "./components/scatterChart/scatterChart";

import monthlyRevenueData from "./dataset/monthly-revenue.json";
import salesByCategoryData from "./dataset/sales-by-category.json";
import websiteTrafficData from "./dataset/website-traffic.json";
import companyStructureData from "./dataset/company-structure.json";
import advertisingSpendRevenueData from "./dataset/advertising-spend-revenue.json";

import {
  TMonthlyRevenueData,
  TSalesByCategoryData,
  TWebsiteTrafficData,
  TCompanyStructureData,
  TAdvertisingSpendRevenueData,
} from "./types/dataset.type";
import { toYearMonth } from "./helpers";
```

Note that `LineChart` and `BarChart` are default exports, while `DonutChart`, `TreeChart` and `ScatterChart` are named exports.

### Line chart

```tsx
<LineChart<TMonthlyRevenueData>
  data={monthlyRevenueData}
  title="Monthly revenue trend"
  xLabel="Month"
  yLabel="Revenue (USD thousands)"
  getX={(d) => d.date}
  getY={(d) => d.revenue}
  formatX={toYearMonth}
/>
```

For multiple lines, add `getGroup` (for example `getGroup={(d) => d.region}`) and optionally `legendTitle`. Clicking a legend item toggles that series. Other useful props: `curve="monotone"`, `showArea`, `showPoints`.

### Bar chart

```tsx
<BarChart<TSalesByCategoryData>
  data={salesByCategoryData}
  title="Sales by product category"
  xLabel="Product category"
  yLabel="Sales (units)"
  getX={(d) => d.category}
  getY={(d) => d.sales}
/>
```

Optional extras: `showValues` to print each value above its bar, `rotateXLabels` for long category names, and `onBarClick={(d) => console.log(d)}`.

### Donut chart

```tsx
<DonutChart<TWebsiteTrafficData>
  data={websiteTrafficData}
  title="Website traffic sources"
  centerLabel="Traffic"
  getLabel={(d) => d.category}
  getValue={(d) => d.value}
  formatValue={(v) => `${v}%`}
/>
```

Optional extras: `innerRadiusRatio={0}` for a pie chart, `getColor` to override the default palette from `src/constants.ts`, and `renderTooltip` for a custom tooltip.

### Tree chart

```tsx
<TreeChart<TCompanyStructureData>
  data={companyStructureData}
  title="Company structure — expandable hierarchy"
  getChildren={(d) => d.children}
  getLabel={(d) => d.name}
/>
```

Note that `data` is a single root node, not an array. Click a node to expand or collapse it. Optional extras: `defaultExpandedDepth={1}` to start partly collapsed, `linkShape="curve"`, `showControls={false}` to hide the expand/collapse buttons, and `onNodeClick`.

### Scatter chart

```tsx
<ScatterChart<TAdvertisingSpendRevenueData>
  data={advertisingSpendRevenueData}
  title="Advertising spend vs. revenue"
  legendTitle="Channel"
  xLabel="Advertising spend (USD thousands)"
  yLabel="Revenue (USD thousands)"
  getX={(d) => d.adSpend}
  getY={(d) => d.revenue}
  getGroup={(d) => d.channel}
/>
```

Omit `getGroup` for a single series (the legend is then hidden). Optional extras: `pointRadius`, `xDomain` / `yDomain`, `showGrid`, and `onPointClick`.

### All together

`src/App.tsx` renders the five charts in a single-column grid:

```tsx
function App() {
  return (
    <div className="container w-4/5 mx-auto py-8">
      <header className="flex justify-center p-4">
        <h1 className="text-3xl font-bold mb-4">
          React + D3.js Data Visualization Assessment
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-8">
        {/* LineChart, BarChart, DonutChart, TreeChart, ScatterChart */}
      </div>
    </div>
  );
}
```

### Using your own data

1. Add a JSON file in `src/dataset/` and a matching type in `src/types/dataset.type.ts`.
2. Render the chart with the accessors that map your fields.
3. Optionally customise it through the extra props, all of which are documented in `src/types/plot.type.ts`.

### Common props

- `data`, plus accessors: `getX`, `getY`, `getGroup`, `getLabel`, `getValue`, `getChildren`
- `title`, `xLabel`, `yLabel`, `legendTitle`
- `height`, `showGrid`, `rotateXLabels`, `yDomain` and `xDomain` (where applicable)
- `formatX`, `formatY`, `formatValue`, `formatPercent`
- `getColor` for custom colours
- `renderTooltip` for a custom tooltip (line and donut charts)
- Interaction callbacks: `onBarClick`, `onPointClick`, `onNodeClick`
- `className` for extra styling on the wrapper

### Chart-specific props

**LineChart:** `curve` (`"linear" | "monotone"`), `showArea`, `showPoints`, `domainPadding`

**BarChart:** `barPadding`, `showValues`

**DonutChart:** `centerLabel`, `innerRadiusRatio`, `padAngle`, `cornerRadius`, `labelMargin`, `minPercentToLabel`, `showLabels`, `showPercentages`

**TreeChart:** `defaultExpandedDepth`, `showControls`, `columnWidth`, `rowHeight`, `groupGap`, `labelSpace`, `rootRadius`, `nodeRadius`, `linkShape` (`"straight" | "curve"`), `animationMs`

**ScatterChart:** `pointRadius`, `domainPadding`

## Sample datasets

| File                             | Used by      | Shape                                 |
| -------------------------------- | ------------ | ------------------------------------- |
| `monthly-revenue.json`           | LineChart    | `{ date, revenue }[]`                 |
| `sales-by-category.json`         | BarChart     | `{ category, sales }[]`               |
| `website-traffic.json`           | DonutChart   | `{ category, value }[]` (percentages) |
| `company-structure.json`         | TreeChart    | Nested `{ name, children? }`          |
| `advertising-spend-revenue.json` | ScatterChart | `{ id, channel, adSpend, revenue }[]` |

## Tech stack

- [React](https://react.dev) 19
- [D3](https://d3js.org) 7
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) with `@vitejs/plugin-react`
- [Tailwind CSS](https://tailwindcss.com) 3 with PostCSS and Autoprefixer
- ESLint with `typescript-eslint`, `react-hooks` and `react-refresh` plugins
