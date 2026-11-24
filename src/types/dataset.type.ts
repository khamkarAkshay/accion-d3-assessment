export type TMonthlyRevenueData = {
  date: string;
  revenue: number;
};

export type TSalesByCategoryData = {
  category: string;
  sales: number;
};

export type TWebsiteTrafficData = {
  category: string;
  value: number;
};

export type TAdvertisingSpendRevenueData = {
  channel: string;
  adSpend: number;
  revenue: number;
};

export type TCompanyStructureData = {
  name: string;
  children?: TCompanyStructureData[];
};
