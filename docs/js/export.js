// Export Manager — PNG export

export class ExportManager {
  constructor(app) {
    this.app = app;
  }

  exportPNG() {
    const dashboard = document.querySelector('.charts-dashboard');
    if (!dashboard) return;

    // Export each chart individually
    const chartIds = [
      'growth-chart', 'drawdown-chart', 'crisis-chart',
      'withdrawal-chart', 'radar-chart', 'heatmap-chart'
    ];

    const chartNames = [
      '資產增長曲線', '回撤走勢圖', '危機期間比較',
      '提領模擬', '指標雷達圖', '年度報酬熱力圖'
    ];

    chartIds.forEach((id, i) => {
      const dom = document.getElementById(id);
      if (!dom) return;

      const chart = echarts.getInstanceByDom(dom);
      if (!chart) return;

      const url = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: this.app.chartRenderer.isDark() ? '#1e293b' : '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `RetireViz_${chartNames[i]}.png`;
      link.href = url;
      link.click();
    });
  }
}
