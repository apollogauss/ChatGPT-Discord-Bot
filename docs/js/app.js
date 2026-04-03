// RetireViz — Main Application
import { PortfolioBuilder } from './portfolio-builder.js';
import { Simulator } from './simulator.js';
import { CrisisScenarios } from './crisis-scenarios.js';
import { ChartRenderer } from './chart-renderer.js';
import { ExportManager } from './export.js';

class App {
  constructor() {
    this.currentStep = 1;
    this.portfolios = [{ id: 0, name: '組合 1', allocations: {} }];
    this.activePortfolioIndex = 0;
    this.retirementParams = {
      initialAmount: 10000000, // 1000萬 (單位：元)
      withdrawalAmount: 50000, // 5萬/月
      withdrawalRate: 4,
      years: 30,
      rebalance: 'yearly',
      inflationAdjust: true,
      taxEnabled: false,
      taxRegime: 'tw'
    };
    this.selectedCrises = [];
    this.customCrises = [];
    this.simulationResults = null;
    this.indexData = {};
  }

  async init() {
    await this.loadData();
    this.portfolioBuilder = new PortfolioBuilder(this);
    this.crisisScenarios = new CrisisScenarios(this);
    this.chartRenderer = new ChartRenderer(this);
    this.exportManager = new ExportManager(this);
    this.bindEvents();
    this.portfolioBuilder.render();
    this.crisisScenarios.render();
    this.applyTheme();
  }

  async loadData() {
    const indices = ['sp500', 'nasdaq100', 'dow', 'vti', 'vxus', 'bnd', 'vnq', 'tw0050', 'tw006208', 'usdtwd', 'inflation'];
    const promises = indices.map(async (name) => {
      try {
        const res = await fetch(`data/${name}.json`);
        const data = await res.json();
        this.indexData[name] = data;
      } catch (e) {
        console.warn(`Failed to load ${name}.json:`, e);
      }
    });
    await Promise.all(promises);
  }

  bindEvents() {
    // Step navigation
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.goToStep(parseInt(btn.dataset.step));
      });
    });

    // Next/Prev buttons
    document.querySelectorAll('.btn-next').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = parseInt(btn.dataset.next);
        if (next === 4) this.runSimulation();
        this.goToStep(next);
      });
    });

    document.querySelectorAll('.btn-prev').forEach(btn => {
      btn.addEventListener('click', () => {
        this.goToStep(parseInt(btn.dataset.prev));
      });
    });

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Retirement params
    this.bindParamEvents();

    // Export
    document.getElementById('export-png')?.addEventListener('click', () => {
      this.exportManager.exportPNG();
    });
  }

  bindParamEvents() {
    const initialInput = document.getElementById('initial-amount');
    const initialSlider = document.getElementById('initial-amount-slider');
    const withdrawalInput = document.getElementById('withdrawal-amount');
    const withdrawalRate = document.getElementById('withdrawal-rate');
    const yearsInput = document.getElementById('invest-years');
    const yearsSlider = document.getElementById('invest-years-slider');

    // Sync initial amount
    initialInput.addEventListener('input', () => {
      const val = parseFloat(initialInput.value) || 0;
      this.retirementParams.initialAmount = val * 10000;
      initialSlider.value = val;
      this.syncWithdrawalRate();
    });
    initialSlider.addEventListener('input', () => {
      initialInput.value = initialSlider.value;
      this.retirementParams.initialAmount = parseFloat(initialSlider.value) * 10000;
      this.syncWithdrawalRate();
    });

    // Sync withdrawal
    withdrawalInput.addEventListener('input', () => {
      const val = parseFloat(withdrawalInput.value) || 0;
      this.retirementParams.withdrawalAmount = val * 10000;
      this.syncWithdrawalRate();
    });

    withdrawalRate.addEventListener('input', () => {
      const rate = parseFloat(withdrawalRate.value) || 0;
      this.retirementParams.withdrawalRate = rate;
      const monthly = (this.retirementParams.initialAmount * rate / 100) / 12;
      this.retirementParams.withdrawalAmount = monthly;
      withdrawalInput.value = (monthly / 10000).toFixed(1);
    });

    // Sync years
    yearsInput.addEventListener('input', () => {
      this.retirementParams.years = parseInt(yearsInput.value) || 30;
      yearsSlider.value = yearsInput.value;
    });
    yearsSlider.addEventListener('input', () => {
      yearsInput.value = yearsSlider.value;
      this.retirementParams.years = parseInt(yearsSlider.value);
    });

    // Rebalance
    document.querySelectorAll('input[name="rebalance"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.retirementParams.rebalance = radio.value;
      });
    });

    // Inflation
    document.getElementById('inflation-adjust').addEventListener('change', (e) => {
      this.retirementParams.inflationAdjust = e.target.checked;
    });

    // Tax
    const taxCheckbox = document.getElementById('tax-enable');
    const taxOptions = document.getElementById('tax-options');
    taxCheckbox.addEventListener('change', (e) => {
      this.retirementParams.taxEnabled = e.target.checked;
      taxOptions.style.display = e.target.checked ? 'block' : 'none';
    });

    document.getElementById('tax-regime').addEventListener('change', (e) => {
      this.retirementParams.taxRegime = e.target.value;
    });
  }

  syncWithdrawalRate() {
    if (this.retirementParams.initialAmount > 0) {
      const annualWithdrawal = this.retirementParams.withdrawalAmount * 12;
      const rate = (annualWithdrawal / this.retirementParams.initialAmount) * 100;
      document.getElementById('withdrawal-rate').value = rate.toFixed(1);
      this.retirementParams.withdrawalRate = rate;
    }
  }

  goToStep(step) {
    // Mark completed steps
    for (let i = 1; i < step; i++) {
      const btn = document.querySelector(`.step-btn[data-step="${i}"]`);
      if (btn) btn.classList.add('completed');
    }

    // Update active step
    document.querySelectorAll('.step-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.step) === step);
    });

    document.querySelectorAll('.step-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `step-${step}`);
    });

    this.currentStep = step;

    // Re-render charts on step 4
    if (step === 4 && this.simulationResults) {
      setTimeout(() => this.chartRenderer.renderAll(this.simulationResults), 100);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  runSimulation() {
    const simulator = new Simulator(this);
    this.simulationResults = simulator.run();
    this.chartRenderer.renderAll(this.simulationResults);
    this.renderSummaryCards(this.simulationResults);
  }

  renderSummaryCards(results) {
    const container = document.getElementById('summary-cards');
    if (!container || !results.portfolioResults.length) return;

    const first = results.portfolioResults[0];
    const fmt = (v, suffix = '%') => {
      const cls = v > 0 ? 'positive' : v < 0 ? 'negative' : 'neutral';
      return `<span class="summary-value ${cls}">${v > 0 ? '+' : ''}${v.toFixed(2)}${suffix}</span>`;
    };

    container.innerHTML = `
      <div class="summary-card">
        ${fmt(first.metrics.cagr)}
        <div class="summary-label">年化報酬率 (CAGR)</div>
      </div>
      <div class="summary-card">
        ${fmt(first.metrics.maxDrawdown)}
        <div class="summary-label">最大回撤</div>
      </div>
      <div class="summary-card">
        ${fmt(first.metrics.volatility)}
        <div class="summary-label">年化波動率</div>
      </div>
      <div class="summary-card">
        ${fmt(first.metrics.sharpe, '')}
        <div class="summary-label">夏普比率</div>
      </div>
      <div class="summary-card">
        ${fmt(first.metrics.swr)}
        <div class="summary-label">安全提領率 (SWR)</div>
      </div>
      <div class="summary-card">
        <span class="summary-value neutral">${first.metrics.survivalYears.toFixed(1)}</span>
        <div class="summary-label">資金存活年數</div>
      </div>
      <div class="summary-card">
        <span class="summary-value ${first.metrics.finalValue > first.metrics.initialValue ? 'positive' : 'negative'}">
          ${(first.metrics.finalValue / 10000).toFixed(0)} 萬
        </span>
        <div class="summary-label">期末資產</div>
      </div>
      <div class="summary-card">
        ${fmt(first.metrics.realReturn)}
        <div class="summary-label">實質報酬率 (扣通膨)</div>
      </div>
    `;
  }

  // Theme management
  applyTheme() {
    const saved = localStorage.getItem('retireviz-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('retireviz-theme', next);
    // Re-render charts with new theme
    if (this.simulationResults) {
      this.chartRenderer.renderAll(this.simulationResults);
    }
  }

  // Get active portfolio
  getActivePortfolio() {
    return this.portfolios[this.activePortfolioIndex];
  }

  // Get index metadata
  getIndexMeta() {
    return [
      { key: 'sp500', name: 'S&P 500', ticker: 'SPY', category: 'us' },
      { key: 'nasdaq100', name: 'NASDAQ 100', ticker: 'QQQ', category: 'us' },
      { key: 'dow', name: '道瓊工業', ticker: 'DIA', category: 'us' },
      { key: 'vti', name: '全美股市', ticker: 'VTI', category: 'us' },
      { key: 'vxus', name: '國際股市', ticker: 'VXUS', category: 'us' },
      { key: 'bnd', name: '美國總債券', ticker: 'BND', category: 'bond' },
      { key: 'vnq', name: '美國 REITs', ticker: 'VNQ', category: 'other' },
      { key: 'tw0050', name: '元大台灣50', ticker: '0050', category: 'tw' },
      { key: 'tw006208', name: '富邦台50', ticker: '006208', category: 'tw' },
    ];
  }
}

// Initialize
const app = new App();
app.init().catch(err => console.error('App init failed:', err));

export { App };
