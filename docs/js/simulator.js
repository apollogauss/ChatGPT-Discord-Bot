// Simulator — Backtesting engine
import { calculateMetrics } from './metrics.js';

export class Simulator {
  constructor(app) {
    this.app = app;
  }

  run() {
    const results = {
      portfolioResults: [],
      crisisAnalysis: [],
      params: { ...this.app.retirementParams }
    };

    // Run simulation for each portfolio
    for (const portfolio of this.app.portfolios) {
      if (Object.keys(portfolio.allocations).length === 0) continue;

      const monthlyReturns = this.buildPortfolioReturns(portfolio);
      if (monthlyReturns.length === 0) continue;

      const growthSeries = this.simulateGrowth(monthlyReturns);
      const withdrawalSim = this.simulateWithdrawal(monthlyReturns);
      const metrics = calculateMetrics(monthlyReturns, growthSeries, withdrawalSim, this.app.retirementParams);

      // Crisis performance
      const crisisPerf = this.analyzeCrises(monthlyReturns);

      // Annual returns for heatmap
      const annualReturns = this.calcAnnualReturns(monthlyReturns);

      results.portfolioResults.push({
        portfolio,
        monthlyReturns,
        growthSeries,
        withdrawalSim,
        metrics,
        crisisPerf,
        annualReturns
      });
    }

    return results;
  }

  // Build blended monthly returns from portfolio allocations
  buildPortfolioReturns(portfolio) {
    const allocs = portfolio.allocations;
    const totalWeight = Object.values(allocs).reduce((s, v) => s + v, 0);
    if (totalWeight === 0) return [];

    // Find common date range
    let maxStartYear = 0;
    let minEndYear = 9999;

    for (const key of Object.keys(allocs)) {
      const data = this.app.indexData[key];
      if (!data || !data.monthlyReturns) continue;
      const years = Object.keys(data.monthlyReturns).map(Number);
      maxStartYear = Math.max(maxStartYear, Math.min(...years));
      minEndYear = Math.min(minEndYear, Math.max(...years));
    }

    if (maxStartYear >= minEndYear) return [];

    const result = [];
    for (let year = maxStartYear; year <= minEndYear; year++) {
      for (let month = 0; month < 12; month++) {
        let blendedReturn = 0;
        let validWeight = 0;

        for (const [key, weight] of Object.entries(allocs)) {
          const data = this.app.indexData[key];
          if (!data || !data.monthlyReturns || !data.monthlyReturns[year]) continue;

          const monthlyData = data.monthlyReturns[year];
          if (month < monthlyData.length) {
            // Normalize weight
            const normWeight = weight / totalWeight;
            blendedReturn += (monthlyData[month] / 100) * normWeight;
            validWeight += normWeight;
          }
        }

        if (validWeight > 0) {
          result.push({
            year,
            month: month + 1,
            date: `${year}-${String(month + 1).padStart(2, '0')}`,
            return: blendedReturn
          });
        }
      }
    }

    return result;
  }

  // Simulate portfolio growth (no withdrawals)
  simulateGrowth(monthlyReturns) {
    const initial = this.app.retirementParams.initialAmount;
    const series = [{ date: monthlyReturns[0]?.date || '0', value: initial }];
    let value = initial;

    for (const mr of monthlyReturns) {
      value *= (1 + mr.return);
      series.push({ date: mr.date, value });
    }

    return series;
  }

  // Simulate withdrawal (retirement spending)
  simulateWithdrawal(monthlyReturns) {
    const params = this.app.retirementParams;
    let balance = params.initialAmount;
    let monthlyWithdrawal = params.withdrawalAmount;
    const inflationMonthly = params.inflationAdjust ? Math.pow(1.02, 1 / 12) - 1 : 0;
    const maxMonths = params.years * 12;

    const series = [{ date: monthlyReturns[0]?.date || '0', balance, withdrawal: 0 }];
    let depleted = false;
    let depletedMonth = maxMonths;

    // Rebalancing tracking
    const allocations = { ...this.app.getActivePortfolio().allocations };
    let monthCounter = 0;

    for (let i = 0; i < Math.min(monthlyReturns.length, maxMonths); i++) {
      const mr = monthlyReturns[i];
      monthCounter++;

      // Apply return
      balance *= (1 + mr.return);

      // Apply tax (simplified)
      if (params.taxEnabled && mr.return > 0) {
        const taxRate = params.taxRegime === 'us' ? 0.15 : 0;
        // Taiwan: overseas income < 6.7M TWD is tax-free
        if (params.taxRegime === 'tw') {
          // Simplified: no tax for most retirees
        } else {
          balance -= balance * mr.return * taxRate * 0.5; // Rough approximation
        }
      }

      // Withdraw
      if (!depleted) {
        balance -= monthlyWithdrawal;

        // Adjust withdrawal for inflation
        if (params.inflationAdjust) {
          monthlyWithdrawal *= (1 + inflationMonthly);
        }
      }

      if (balance <= 0 && !depleted) {
        balance = 0;
        depleted = true;
        depletedMonth = i + 1;
      }

      series.push({
        date: mr.date,
        balance: Math.max(0, balance),
        withdrawal: monthlyWithdrawal
      });
    }

    return {
      series,
      depleted,
      depletedMonth,
      survivalMonths: depleted ? depletedMonth : maxMonths,
      survivalYears: (depleted ? depletedMonth : maxMonths) / 12
    };
  }

  // Analyze crisis periods
  analyzeCrises(monthlyReturns) {
    const selectedCrises = this.app.selectedCrises;
    const customCrises = this.app.customCrises;
    const allCrises = [...selectedCrises, ...customCrises];
    const results = [];

    for (const crisis of allCrises) {
      if (crisis.custom) {
        // Custom stress test
        const dropPct = crisis.drop / 100;
        const recoveryMonths = crisis.recovery;
        const monthlyDrop = Math.pow(1 + dropPct, 1 / Math.ceil(recoveryMonths * 0.4)) - 1;
        const monthlyRecovery = Math.pow(1 / (1 + dropPct), 1 / Math.ceil(recoveryMonths * 0.6)) - 1;

        results.push({
          name: crisis.name,
          maxDrawdown: crisis.drop,
          recoveryMonths: crisis.recovery,
          custom: true
        });
        continue;
      }

      // Historical crisis
      const crisisReturns = monthlyReturns.filter(mr => {
        const date = new Date(mr.year, mr.month - 1);
        return date >= new Date(crisis.startYear, crisis.startMonth - 1) &&
               date <= new Date(crisis.endYear, crisis.endMonth - 1);
      });

      if (crisisReturns.length === 0) {
        results.push({
          name: crisis.name,
          maxDrawdown: crisis.typicalDrop,
          recoveryMonths: crisis.typicalRecovery,
          noData: true
        });
        continue;
      }

      // Calculate drawdown during crisis
      let peak = 1;
      let value = 1;
      let maxDD = 0;

      for (const mr of crisisReturns) {
        value *= (1 + mr.return);
        peak = Math.max(peak, value);
        const dd = (value - peak) / peak;
        maxDD = Math.min(maxDD, dd);
      }

      const totalReturn = crisisReturns.reduce((acc, mr) => acc * (1 + mr.return), 1) - 1;

      results.push({
        name: crisis.name,
        maxDrawdown: maxDD * 100,
        totalReturn: totalReturn * 100,
        duration: crisisReturns.length,
        recoveryMonths: crisis.typicalRecovery
      });
    }

    return results;
  }

  // Calculate annual returns
  calcAnnualReturns(monthlyReturns) {
    const annual = {};

    for (const mr of monthlyReturns) {
      if (!annual[mr.year]) {
        annual[mr.year] = { cumReturn: 1, months: 0 };
      }
      annual[mr.year].cumReturn *= (1 + mr.return);
      annual[mr.year].months++;
    }

    return Object.entries(annual)
      .filter(([, v]) => v.months === 12)
      .map(([year, v]) => ({
        year: parseInt(year),
        return: (v.cumReturn - 1) * 100
      }));
  }
}
