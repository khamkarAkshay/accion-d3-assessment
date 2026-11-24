import BarChart from "./components/barChart/barChart";
import { DonutChart } from "./components/donutChart/donutChart";
import LineChart from "./components/lineChart/lineChart";
import monthlyRevenueData from "./dataset/monthly-revenue.json";
import salesByCategoryData from "./dataset/sales-by-category.json";
import websiteTrafficData from "./dataset/website-traffic.json";
import companyStructureData from "./dataset/company-structure.json";
import advertisingSpendRevenueData from "./dataset/advertising-spend-revenue.json";
import {
  TMonthlyRevenueData,
  TSalesByCategoryData,
  TWebsiteTrafficData,
  TAdvertisingSpendRevenueData,
  TCompanyStructureData,
} from "./types/dataset.type";
import { TreeChart } from "./components/treeChart/treeChart";
import { ScatterChart } from "./components/scatterChart/scatterChart";
import { toYearMonth } from "./helpers";

function App() {
  return (
    <div className="container w-4/5 mx-auto py-8">
      <header className="flex justify-center p-4">
        <h1 className="text-3xl font-bold mb-4">
          React + D3.js Data Visualization Assessment
        </h1>
      </header>
      <div className="grid grid-cols-1 gap-8">
        <LineChart<TMonthlyRevenueData>
          data={monthlyRevenueData}
          title="Monthly revenue trend"
          xLabel="Month"
          yLabel="Revenue (USD thousands)"
          getX={(d) => d.date}
          getY={(d) => d.revenue}
          formatX={toYearMonth}
        />

        <BarChart<TSalesByCategoryData>
          data={salesByCategoryData}
          title="Sales by product category"
          xLabel="Product category"
          yLabel="Sales (units)"
          getX={(d) => d.category}
          getY={(d) => d.sales}
        />

        <DonutChart<TWebsiteTrafficData>
          data={websiteTrafficData}
          title="Website traffic sources"
          centerLabel="Traffic"
          getLabel={(d) => d.category}
          getValue={(d) => d.value}
          formatValue={(v) => `${v}%`}
        />

        <TreeChart<TCompanyStructureData>
          data={companyStructureData}
          title="Company structure — expandable hierarchy"
          getChildren={(d) => d.children}
          getLabel={(d) => d.name}
        />

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
      </div>
    </div>
  );
}

export default App;
