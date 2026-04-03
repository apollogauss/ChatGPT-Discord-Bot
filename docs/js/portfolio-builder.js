// Portfolio Builder — Index selection and weight allocation

export class PortfolioBuilder {
  constructor(app) {
    this.app = app;
    this.presets = [
      {
        name: '保守型',
        desc: '60% 債券 / 40% 股票',
        allocations: { sp500: 25, vxus: 15, bnd: 60 }
      },
      {
        name: '平衡型',
        desc: '60% 股票 / 40% 債券',
        allocations: { sp500: 35, vxus: 25, bnd: 40 }
      },
      {
        name: '積極型',
        desc: '90% 股票 / 10% 債券',
        allocations: { sp500: 50, vxus: 30, vnq: 10, bnd: 10 }
      },
      {
        name: '全球分散',
        desc: 'VTI + VXUS + BND',
        allocations: { vti: 40, vxus: 30, bnd: 30 }
      },
      {
        name: '台灣投資者',
        desc: '0050 + 美股 + 債券',
        allocations: { tw0050: 30, sp500: 30, vxus: 15, bnd: 25 }
      }
    ];
  }

  render() {
    this.renderPresets();
    this.renderIndices();
    this.renderPortfolioTabs();
    this.bindPortfolioEvents();
  }

  renderPresets() {
    const grid = document.getElementById('preset-grid');
    if (!grid) return;

    grid.innerHTML = this.presets.map((preset, i) => `
      <div class="preset-card" data-preset="${i}">
        <div class="preset-name">${preset.name}</div>
        <div class="preset-desc">${preset.desc}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.preset);
        this.applyPreset(this.presets[idx]);
        grid.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
  }

  renderIndices() {
    const categories = {
      us: document.getElementById('us-indices'),
      tw: document.getElementById('tw-indices'),
      bond: document.getElementById('bond-indices'),
      other: document.getElementById('other-indices')
    };

    const portfolio = this.app.getActivePortfolio();

    this.app.getIndexMeta().forEach(idx => {
      const container = categories[idx.category];
      if (!container) return;

      const weight = portfolio.allocations[idx.key] || 0;
      const checked = weight > 0 ? 'checked' : '';
      const selected = weight > 0 ? 'selected' : '';

      const div = document.createElement('div');
      div.className = `index-item ${selected}`;
      div.dataset.index = idx.key;
      div.innerHTML = `
        <input type="checkbox" class="index-checkbox" data-key="${idx.key}" ${checked}>
        <div class="index-info">
          <div class="index-name">${idx.name}</div>
          <div class="index-ticker">${idx.ticker}</div>
        </div>
        <div class="index-weight">
          <input type="number" class="weight-input" data-key="${idx.key}"
                 value="${weight}" min="0" max="100" step="5"
                 ${!checked ? 'disabled' : ''}>
          <span class="param-unit">%</span>
        </div>
      `;
      container.appendChild(div);
    });

    this.bindIndexEvents();
    this.updateWeightSummary();
  }

  bindIndexEvents() {
    // Checkbox toggle
    document.querySelectorAll('.index-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.key;
        const item = cb.closest('.index-item');
        const weightInput = item.querySelector('.weight-input');

        if (cb.checked) {
          item.classList.add('selected');
          weightInput.disabled = false;
          if (parseFloat(weightInput.value) === 0) {
            weightInput.value = 10;
          }
          this.app.getActivePortfolio().allocations[key] = parseFloat(weightInput.value);
        } else {
          item.classList.remove('selected');
          weightInput.disabled = true;
          weightInput.value = 0;
          delete this.app.getActivePortfolio().allocations[key];
        }
        this.updateWeightSummary();
        this.updateAllocationChart();
      });
    });

    // Weight input
    document.querySelectorAll('.weight-input').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.key;
        const val = parseFloat(input.value) || 0;
        if (val > 0) {
          this.app.getActivePortfolio().allocations[key] = val;
        } else {
          delete this.app.getActivePortfolio().allocations[key];
        }
        this.updateWeightSummary();
        this.updateAllocationChart();
      });
    });
  }

  applyPreset(preset) {
    const portfolio = this.app.getActivePortfolio();
    portfolio.allocations = { ...preset.allocations };

    // Update UI
    document.querySelectorAll('.index-item').forEach(item => {
      const key = item.dataset.index;
      const cb = item.querySelector('.index-checkbox');
      const weightInput = item.querySelector('.weight-input');
      const weight = preset.allocations[key] || 0;

      cb.checked = weight > 0;
      weightInput.value = weight;
      weightInput.disabled = weight === 0;
      item.classList.toggle('selected', weight > 0);
    });

    this.updateWeightSummary();
    this.updateAllocationChart();
  }

  updateWeightSummary() {
    const portfolio = this.app.getActivePortfolio();
    const total = Object.values(portfolio.allocations).reduce((s, v) => s + v, 0);
    const bar = document.getElementById('weight-bar');
    const label = document.getElementById('weight-total');

    if (bar) {
      bar.style.width = `${Math.min(total, 100)}%`;
      bar.className = 'weight-bar';
      if (total > 100) bar.classList.add('over');
      else if (total === 100) bar.classList.add('complete');
    }

    if (label) {
      label.textContent = `總權重: ${total.toFixed(0)}%`;
      label.style.color = total === 100
        ? 'var(--accent-success)'
        : total > 100
          ? 'var(--accent-danger)'
          : 'var(--text-primary)';
    }
  }

  updateAllocationChart() {
    const portfolio = this.app.getActivePortfolio();
    const allocs = portfolio.allocations;
    const meta = this.app.getIndexMeta();

    const data = Object.entries(allocs)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => {
        const m = meta.find(x => x.key === key);
        return { name: m ? m.name : key, value };
      });

    const chartDom = document.getElementById('allocation-chart');
    if (!chartDom || data.length === 0) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    let chart = echarts.getInstanceByDom(chartDom);
    if (!chart) {
      chart = echarts.init(chartDom, isDark ? 'dark' : null);
    }

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: {c}% ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: isDark ? '#1e293b' : '#fff', borderWidth: 2 },
        label: { show: true, fontSize: 12 },
        data: data
      }]
    }, true);

    window.addEventListener('resize', () => chart.resize(), { once: true });
  }

  renderPortfolioTabs() {
    const tabBar = document.getElementById('portfolio-tab-bar');
    const addBtn = document.getElementById('add-portfolio-btn');

    if (!tabBar || !addBtn) return;

    this.refreshTabs();

    addBtn.addEventListener('click', () => {
      if (this.app.portfolios.length >= 5) return;
      const id = this.app.portfolios.length;
      this.app.portfolios.push({ id, name: `組合 ${id + 1}`, allocations: {} });
      this.app.activePortfolioIndex = id;
      this.refreshTabs();
      this.refreshIndexUI();
    });
  }

  refreshTabs() {
    const tabBar = document.getElementById('portfolio-tab-bar');
    if (!tabBar) return;

    tabBar.innerHTML = this.app.portfolios.map((p, i) => `
      <button class="portfolio-tab ${i === this.app.activePortfolioIndex ? 'active' : ''}"
              data-portfolio="${i}">${p.name}</button>
    `).join('');

    tabBar.querySelectorAll('.portfolio-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.app.activePortfolioIndex = parseInt(tab.dataset.portfolio);
        this.refreshTabs();
        this.refreshIndexUI();
      });
    });
  }

  refreshIndexUI() {
    const portfolio = this.app.getActivePortfolio();

    document.querySelectorAll('.index-item').forEach(item => {
      const key = item.dataset.index;
      const cb = item.querySelector('.index-checkbox');
      const weightInput = item.querySelector('.weight-input');
      const weight = portfolio.allocations[key] || 0;

      cb.checked = weight > 0;
      weightInput.value = weight;
      weightInput.disabled = weight === 0;
      item.classList.toggle('selected', weight > 0);
    });

    this.updateWeightSummary();
    this.updateAllocationChart();

    // Clear preset selection
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
  }

  bindPortfolioEvents() {
    // Already bound in renderPortfolioTabs
  }
}
