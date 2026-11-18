import { forecastingData } from "./_shared/forecast-data.mjs";
import { createPremiumOperationHandler, consumePremiumUsage } from "./_shared/premium-operation.mjs";

export default createPremiumOperationHandler({
  permission: "forecasting",
  method: "GET",
  dailyLimit: 120,
  consumeUsage: consumePremiumUsage,
  execute: async () => forecastingData,
});
