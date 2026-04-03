// Crisis Scenarios — Historical crisis definitions + custom scenarios

export class CrisisScenarios {
  constructor(app) {
    this.app = app;
    this.historicalCrises = [
      {
        id: 'black-monday-1987',
        name: '1987 黑色星期一',
        description: '道瓊單日暴跌 22.6%，全球股市連鎖崩盤',
        startYear: 1987, startMonth: 8,
        endYear: 1987, endMonth: 12,
        typicalDrop: -33.5,
        typicalRecovery: 20,
        emoji: '⬛'
      },
      {
        id: 'dotcom-2000',
        name: '2000 網路泡沫',
        description: '科技股泡沫破裂，NASDAQ 暴跌 78%',
        startYear: 2000, startMonth: 3,
        endYear: 2002, endMonth: 10,
        typicalDrop: -49.1,
        typicalRecovery: 56,
        emoji: '💻'
      },
      {
        id: 'gfc-2008',
        name: '2008 金融海嘯',
        description: '次貸危機引發全球金融系統崩潰',
        startYear: 2007, startMonth: 10,
        endYear: 2009, endMonth: 3,
        typicalDrop: -56.8,
        typicalRecovery: 49,
        emoji: '🏦'
      },
      {
        id: 'euro-debt-2011',
        name: '2011 歐債危機',
        description: '歐洲主權債務危機蔓延',
        startYear: 2011, startMonth: 5,
        endYear: 2011, endMonth: 10,
        typicalDrop: -19.4,
        typicalRecovery: 5,
        emoji: '🇪🇺'
      },
      {
        id: 'china-crash-2015',
        name: '2015 中國股災',
        description: '中國股市暴跌帶動全球市場波動',
        startYear: 2015, startMonth: 6,
        endYear: 2016, endMonth: 2,
        typicalDrop: -14.2,
        typicalRecovery: 4,
        emoji: '🇨🇳'
      },
      {
        id: 'q4-2018',
        name: '2018 Q4 急跌',
        description: '聯準會升息 + 貿易戰恐慌',
        startYear: 2018, startMonth: 10,
        endYear: 2018, endMonth: 12,
        typicalDrop: -19.8,
        typicalRecovery: 4,
        emoji: '📉'
      },
      {
        id: 'covid-2020',
        name: '2020 COVID 崩盤',
        description: '全球疫情引發市場恐慌性拋售',
        startYear: 2020, startMonth: 2,
        endYear: 2020, endMonth: 3,
        typicalDrop: -33.9,
        typicalRecovery: 5,
        emoji: '🦠'
      },
      {
        id: 'rate-hike-2022',
        name: '2022 升息衝擊',
        description: '聯準會激進升息對抗通膨',
        startYear: 2022, startMonth: 1,
        endYear: 2022, endMonth: 10,
        typicalDrop: -25.4,
        typicalRecovery: 10,
        emoji: '📊'
      }
    ];
  }

  render() {
    this.renderCrisisGrid();
    this.bindCrisisEvents();
  }

  renderCrisisGrid() {
    const grid = document.getElementById('crisis-grid');
    if (!grid) return;

    grid.innerHTML = this.historicalCrises.map(crisis => `
      <div class="crisis-card" data-crisis="${crisis.id}">
        <input type="checkbox" class="crisis-checkbox" data-crisis-id="${crisis.id}">
        <div class="crisis-info">
          <div class="crisis-name">${crisis.emoji} ${crisis.name}</div>
          <div class="crisis-detail">${crisis.description}</div>
        </div>
        <div class="crisis-badge">${crisis.typicalDrop}%</div>
      </div>
    `).join('');
  }

  bindCrisisEvents() {
    // Crisis card click
    document.querySelectorAll('.crisis-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') return;
        const cb = card.querySelector('.crisis-checkbox');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));
      });
    });

    // Crisis checkbox
    document.querySelectorAll('.crisis-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.crisisId;
        const card = cb.closest('.crisis-card');
        card.classList.toggle('selected', cb.checked);

        if (cb.checked) {
          const crisis = this.historicalCrises.find(c => c.id === id);
          if (crisis && !this.app.selectedCrises.find(c => c.id === id)) {
            this.app.selectedCrises.push(crisis);
          }
        } else {
          this.app.selectedCrises = this.app.selectedCrises.filter(c => c.id !== id);
        }
      });
    });

    // Select all / deselect all
    document.getElementById('select-all-crises')?.addEventListener('click', () => {
      document.querySelectorAll('.crisis-checkbox').forEach(cb => {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
      });
    });

    document.getElementById('deselect-all-crises')?.addEventListener('click', () => {
      document.querySelectorAll('.crisis-checkbox').forEach(cb => {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
      });
    });

    // Custom crisis
    document.getElementById('add-custom-crisis')?.addEventListener('click', () => {
      const drop = parseFloat(document.getElementById('custom-drop').value) || -40;
      const recovery = parseInt(document.getElementById('custom-recovery').value) || 24;

      const custom = {
        id: `custom-${Date.now()}`,
        name: `自訂 (${drop}%, ${recovery}個月)`,
        drop: drop,
        recovery: recovery,
        custom: true
      };

      this.app.customCrises.push(custom);

      // Add to grid
      const grid = document.getElementById('crisis-grid');
      const div = document.createElement('div');
      div.className = 'crisis-card custom selected';
      div.dataset.crisis = custom.id;
      div.innerHTML = `
        <input type="checkbox" class="crisis-checkbox" checked>
        <div class="crisis-info">
          <div class="crisis-name">🔧 ${custom.name}</div>
          <div class="crisis-detail">自訂壓力測試</div>
        </div>
        <div class="crisis-badge">${drop}%</div>
      `;
      grid.appendChild(div);

      // Bind remove on uncheck
      const cb = div.querySelector('.crisis-checkbox');
      cb.addEventListener('change', () => {
        if (!cb.checked) {
          this.app.customCrises = this.app.customCrises.filter(c => c.id !== custom.id);
          div.classList.remove('selected');
        } else {
          this.app.customCrises.push(custom);
          div.classList.add('selected');
        }
      });
    });
  }
}
