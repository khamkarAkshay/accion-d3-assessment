export const toYearMonth = (x: string) =>
  /^\d{4}-\d{2}-\d{2}/.test(x) ? x.slice(0, 7) : x;
