// Chart Renderer — ECharts visualization manager

export class ChartRenderer {
  constructor(app) {
    this.app = app;
    this.charts = {};
    this.colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

    window.addEventListener('resize', () => this.resizeAll());
  }

  isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  getChart(domId) {
    const dom = document.getElementById(domId);
    if (!dom) return null;

    if (this.charts[domId]) {
      this.charts[domId].dispose();
    }

    const chart = echarts.init(dom, this.isDark() ? 'dark' : null);
    this.charts[domId] = chart;
    return chart;
  }

  resizeAll() {
    Object.values(this.charts).forEach(chart => {
      if (chart && !chart.isDisposed()) chart.resize();
    });
  }

  renderAll(results) {
    if (!results || !results.portfolioResults.length) return;

    this.renderGrowthChart(results);
    this.renderDrawdownChart(results);
    this.renderCrisisChart(results);
    this.renderWithdrawalChart(results);
    this.renderRadarChart(results);
    this.renderHeatmapChart(results);

    // Slight delay for proper sizing
    setTimeout(() => this.resizeAll(), 200);
  }

  // 1. Portfolio Growth Chart (line)
  renderGrowthChart(results) {
    const chart = this.getChart('growth-chart');
    if (!chart) return;

    const series = results.portfolioResults.map((pr, i) => ({
      name: pr.portfolio.name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.05 },
      data: pr.growthSeries.map(p => [p.date, Math.round(p.value)]),
      color: this.colors[i % this.colors.length]
    }));

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let html = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach(p => {
            const val = (p.value[1] / 10000).toFixed(0);
            html += `${p.marker} ${p.seriesName}: ${val} 萬元<br/>`;
          });
          return html;
        }
      },
      legend: { top: 0 },
      grid: { top: 40, right: 20, bottom: 60, left: 70 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLabel: {
          rotate: 45,
          formatter: (val) => val.substring(0, 7)
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (val) => `${(val / 10000).toFixed(0)}萬`
        }
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, bottom: 10 }
      ],
      series
    });
  }

  // 2. Drawdown Chart
  renderDrawdownChart(results) {
    const chart = this.getChart('drawdown-chart');
    if (!chart) return;

    const series = results.portfolioResults.map((pr, i) => {
      // Calculate drawdown series
      const ddData = [];
      let peak = -Infinity;

      for (const point of pr.growthSeries) {
        peak = Math.max(peak, point.value);
        const dd = ((point.value - peak) / peak) * 100;
        ddData.push([point.date, dd.toFixed(2)]);
      }

      return {
        name: pr.portfolio.name,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5 },
        areaStyle: { opacity: 0.15, color: this.colors[i % this.colors.length] },
        data: ddData,
        color: this.colors[i % this.colors.length]
      };
    });

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let html = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach(p => {
            html += `${p.marker} ${p.seriesName}: ${p.value[1]}%<br/>`;
          });
          return html;
        }
      },
      legend: { top: 0 },
      grid: { top: 40, right: 20, bottom: 60, left: 60 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLabel: { rotate: 45, formatter: (val) => val.substring(0, 7) }
      },
      yAxis: {
        type: 'value',
        max: 0,
        axisLabel: { formatter: '{value}%' }
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, bottom: 10 }
      ],
      series
    });
  }

  // 3. Crisis Comparison Chart (bar)
  renderCrisisChart(results) {
    const chart = this.getChart('crisis-chart');
    if (!chart) return;

    const firstResult = results.portfolioResults[0];
    if (!firstResult || !firstResult.crisisPerf.length) {
      chart.setOption({
        backgroundColor: 'transparent',
        title: { text: '請在步驟 3 選擇危機情境', left: 'center', top: 'center', textStyle: { color: '#999', fontSize: 14 } }
      });
      return;
    }

    const crisisNames = firstResult.crisisPerf.map(c => c.name);

    const series = results.portfolioResults.map((pr, i) => ({
      name: pr.portfolio.name,
      type: 'bar',
      data: pr.crisisPerf.map(c => c.maxDrawdown?.toFixed(1) || c.drop || 0),
      color: this.colors[i % this.colors.length],
      barMaxWidth: 40
    }));

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          let html = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach(p => {
            html += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`;
          });
          return html;
        }
      },
      legend: { top: 0 },
      grid: { top: 40, right: 20, bottom: 80, left: 60 },
      xAxis: {
        type: 'category',
        data: crisisNames,
        axisLabel: { rotate: 30, fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        max: 0,
        axisLabel: { formatter: '{value}%' }
      },
      series
    });
  }

  // 4. Withdrawal Simulation Chart (area)
  renderWithdrawalChart(results) {
    const chart = this.getChart('withdrawal-chart');
    if (!chart) return;

    const series = results.portfolioResults.map((pr, i) => ({
      name: pr.portfolio.name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      areaStyle: { opacity: 0.2 },
      lineStyle: { width: 2 },
      data: pr.withdrawalSim.series.map(p => [p.date, Math.round(p.balance)]),
      color: this.colors[i % this.colors.length],
      markLine: pr.withdrawalSim.depleted ? {
        data: [{ xAxis: pr.withdrawalSim.series[pr.withdrawalSim.depletedMonth]?.date }],
        label: { formatter: '資金耗盡' },
        lineStyle: { color: '#ef4444', type: 'dashed' }
      } : undefined
    }));

    // Add zero line reference
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let html = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach(p => {
            const val = (p.value[1] / 10000).toFixed(0);
            html += `${p.marker} ${p.seriesName}: ${val} 萬元<br/>`;
          });
          return html;
        }
      },
      legend: { top: 0 },
      grid: { top: 40, right: 20, bottom: 60, left: 70 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLabel: { rotate: 45, formatter: (val) => val.substring(0, 7) }
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLabel: { formatter: (val) => `${(val / 10000).toFixed(0)}萬` }
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100, bottom: 10 }
      ],
      series
    });
  }

  // 5. Metrics Radar Chart
  renderRadarChart(results) {
    const chart = this.getChart('radar-chart');
    if (!chart) return;

    // Normalize metrics to 0-100 scale for radar
    const indicators = [
      { name: '報酬率', max: 15 },
      { name: '低波動', max: 30 },
      { name: '夏普比率', max: 2 },
      { name: '低回撤', max: 60 },
      { name: '安全提領率', max: 8 },
      { name: '資金存活', max: results.params.years }
    ];

    const seriesData = results.portfolioResults.map((pr, i) => ({
      name: pr.portfolio.name,
      value: [
        Math.max(0, pr.metrics.cagr),
        Math.max(0, 30 - pr.metrics.volatility), // Inverted: lower is better
        Math.max(0, pr.metrics.sharpe),
        Math.max(0, 60 + pr.metrics.maxDrawdown), // Inverted: less negative is better
        Math.max(0, pr.metrics.swr),
        pr.metrics.survivalYears
      ],
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.1 },
      itemStyle: { color: this.colors[i % this.colors.length] }
    }));

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { top: 0 },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        center: ['50%', '55%'],
        radius: '65%'
      },
      series: [{
        type: 'radar',
        data: seriesData
      }]
    });
  }

  // 6. Annual Returns Heatmap
  renderHeatmapChart(results) {
    const chart = this.getChart('heatmap-chart');
    if (!chart) return;

    // For simplicity, show first portfolio's annual returns
    const firstResult = results.portfolioResults[0];
    if (!firstResult) return;

    const annualReturns = firstResult.annualReturns;
    const years = annualReturns.map(a => a.year);
    const portfolioNames = results.portfolioResults.map(pr => pr.portfolio.name);

    // Build heatmap data: [portfolioIndex, yearIndex, value]
    const data = [];
    results.portfolioResults.forEach((pr, pi) => {
      pr.annualReturns.forEach(ar => {
        const yi = years.indexOf(ar.year);
        if (yi >= 0) {
          data.push([yi, pi, ar.return.toFixed(1)]);
        }
      });
    });

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params) => {
          const year = years[params.value[0]];
          const portfolio = portfolioNames[params.value[1]];
          const ret = params.value[2];
          return `${portfolio}<br/>${year}: ${ret > 0 ? '+' : ''}${ret}%`;
        }
      },
      grid: { top: 10, right: 80, bottom: 60, left: 100 },
      xAxis: {
        type: 'category',
        data: years,
        splitArea: { show: true },
        axisLabel: { rotate: 45, fontSize: 10 }
      },
      yAxis: {
        type: 'category',
        data: portfolioNames,
        splitArea: { show: true }
      },
      visualMap: {
        min: -50,
        max: 50,
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        inRange: {
          color: ['#ef4444', '#fbbf24', '#f8f9fa', '#34d399', '#10b981']
        },
        textStyle: { fontSize: 10 }
      },
      series: [{
        type: 'heatmap',
        data: data,
        label: {
          show: data.length <= 100,
          fontSize: 9,
          formatter: (p) => {
            const v = parseFloat(p.value[2]);
            return v > 0 ? `+${v}` : `${v}`;
          }
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' }
        }
      }]
    });
  }
}
