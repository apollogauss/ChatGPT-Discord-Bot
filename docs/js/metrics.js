// Metrics — Financial calculations
// Standard formulas used in portfolio analysis

export function calculateMetrics(monthlyReturns, growthSeries, withdrawalSim, params) {
  const returns = monthlyReturns.map(mr => mr.return);

  return {
    cagr: calcCAGR(growthSeries),
    maxDrawdown: calcMaxDrawdown(growthSeries),
    volatility: calcVolatility(returns),
    sharpe: calcSharpe(returns),
    swr: calcSWR(withdrawalSim, params),
    survivalYears: withdrawalSim.survivalYears,
    finalValue: growthSeries[growthSeries.length - 1]?.value || 0,
    initialValue: params.initialAmount,
    realReturn: calcRealReturn(calcCAGR(growthSeries)),
    totalReturn: growthSeries.length > 1
      ? ((growthSeries[growthSeries.length - 1].value / growthSeries[0].value) - 1) * 100
      : 0
  };
}

// Compound Annual Growth Rate
// Formula: (EndValue / StartValue)^(1/years) - 1
function calcCAGR(growthSeries) {
  if (growthSeries.length < 2) return 0;

  const startVal = growthSeries[0].value;
  const endVal = growthSeries[growthSeries.length - 1].value;
  const months = growthSeries.length - 1;
  const years = months / 12;

  if (startVal <= 0 || endVal <= 0 || years <= 0) return 0;

  return (Math.pow(endVal / startVal, 1 / years) - 1) * 100;
}

// Maximum Drawdown
// The largest peak-to-trough decline
function calcMaxDrawdown(growthSeries) {
  let peak = -Infinity;
  let maxDD = 0;

  for (const point of growthSeries) {
    peak = Math.max(peak, point.value);
    const dd = (point.value - peak) / peak;
    maxDD = Math.min(maxDD, dd);
  }

  return maxDD * 100;
}

// Annualized Volatility
// Std deviation of monthly returns * sqrt(12)
function calcVolatility(returns) {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const monthlyStd = Math.sqrt(variance);

  return monthlyStd * Math.sqrt(12) * 100;
}

// Sharpe Ratio
// (Annualized Return - Risk Free Rate) / Annualized Volatility
// Using 2% as risk-free rate approximation
function calcSharpe(returns) {
  if (returns.length < 12) return 0;

  const monthlyMean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const annualizedReturn = Math.pow(1 + monthlyMean, 12) - 1;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const annualizedVol = Math.sqrt(variance) * Math.sqrt(12);

  const riskFreeRate = 0.02; // 2% approximation

  if (annualizedVol === 0) return 0;

  return (annualizedReturn - riskFreeRate) / annualizedVol;
}

// Safe Withdrawal Rate (simplified Trinity Study approach)
// The max rate at which the portfolio survives the full period
function calcSWR(withdrawalSim, params) {
  if (withdrawalSim.depleted) {
    // If depleted, SWR is less than current rate
    return params.withdrawalRate * (withdrawalSim.survivalYears / params.years);
  }
  // If survived, current rate is safe
  return params.withdrawalRate;
}

// Real Return (inflation-adjusted)
// Using average 2.5% inflation assumption
function calcRealReturn(nominalCAGR) {
  const avgInflation = 2.5;
  // Fisher equation: (1 + nominal) / (1 + inflation) - 1
  return ((1 + nominalCAGR / 100) / (1 + avgInflation / 100) - 1) * 100;
}
