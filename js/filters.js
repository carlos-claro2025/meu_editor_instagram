window.Filters = {
  init() {
    // Clique no card de filtro
    document.getElementById('filterGrid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.filter-card');
      if (!card) return;
      document.querySelectorAll('.filter-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      window.State._preset = card.dataset.filter || 'none';
      window.State.filter = card.dataset.filter || 'none';

      // Se há célula selecionada, salva e aplica apenas nela
      if (window.State.activeCell !== null) {
        this.saveCellFilter(window.State.activeCell);
        this.applyCellFilter(window.State.activeCell);
        if (window.History?.push) window.History.push('cell-filter');
      } else {
        this.apply();
        if (window.History?.push) window.History.push('filter-change');
      }
    });

    // Lista de todos os sliders de ajuste
    const sliders = [
      { id: 'brightness',  key: 'brightness'  },
      { id: 'contrast',    key: 'contrast'    },
      { id: 'exposure',    key: 'exposure'    },
      { id: 'shadows',     key: 'shadows'     },
      { id: 'highlights',  key: 'highlights'  },
      { id: 'temperature', key: 'temperature' },
      { id: 'tint',        key: 'tint'        },
      { id: 'saturation',  key: 'saturation'  },
      { id: 'clarity',     key: 'clarity'     },
      { id: 'zoom',        key: 'zoom'        },
    ];

    sliders.forEach(({ id, key }) => {
      const input = document.getElementById(id);
      const val   = document.getElementById(id + 'Val');
      if (!input) return;
      input.addEventListener('input', () => {
        const v = Number(input.value);
        window.State[key] = v;
        if (val) val.textContent = v;
        if (key === 'zoom') {
          // Zoom é global: escala o fundo inteiro, mesmo com célula selecionada
          const bg = document.getElementById('bg');
          if (bg) bg.style.transform = `scale(${v / 100})`;
          return;
        }
        if (window.State.activeCell !== null) {
          this.saveCellFilter(window.State.activeCell);
          this.applyCellFilter(window.State.activeCell);
        } else {
          this.apply();
        }
      });
      // Histórico só no commit do slider: um passo por arraste, não por pixel
      input.addEventListener('change', () => {
        if (!window.History?.push) return;
        window.History.push(window.State.activeCell !== null ? 'cell-filter' : 'filter-change');
      });
    });

    document.getElementById('resetAdjustmentsBtn')?.addEventListener('click', () => {
      if (window.State.activeCell !== null) {
        delete window.State.cellFilters[window.State.activeCell];
        this.applyCellFilter(window.State.activeCell);
        window.State.activeCell = null;
        document.querySelectorAll('.template-cell').forEach(c => {
          c.classList.remove('selected');
          c.style.borderColor = '';
        });
        this.syncSliders();
        if (window.showToast) window.showToast('Ajustes da célula resetados', 1600, 'info');
        if (window.History?.push) window.History.push('cell-filter');
      } else {
        window.State._preset = 'none';
        window.State.filter = 'none';
        document.querySelectorAll('.filter-card').forEach(c => {
          c.classList.toggle('active', (c.dataset.filter || 'none') === 'none');
        });
        const defaults = { brightness:100, contrast:100, exposure:100, shadows:100, highlights:100, temperature:100, tint:100, saturation:100, clarity:100, zoom:100 };
        Object.keys(defaults).forEach(key => {
          window.State[key] = defaults[key];
          const inp = document.getElementById(key);
          const vl  = document.getElementById(key + 'Val');
          if (inp) inp.value = defaults[key];
          if (vl)  vl.textContent = defaults[key];
        });
        this.apply();
        if (window.showToast) window.showToast('Ajustes resetados', 1600, 'info');
        if (window.History?.push) window.History.push('filter-change');
      }
    });
  },

  // Constrói string CSS filter
  getFilterString(filters) {
    return window.State.getFilterString(filters);
  },

  // Aplica filtro em TODAS as células (modo global)
  apply() {
    const bg = document.getElementById('bg');
    const str = this.getFilterString(window.State);
    const zoom = window.State.zoom;

    // Zoom e filtro só no fundo quando nenhuma célula está selecionada
    if (bg) {
      if (window.State.activeCell === null) {
        bg.style.filter = str || 'none';
        bg.style.transform = `scale(${zoom / 100})`;
      } else {
        // Célula selecionada: filtro global não afeta o fundo
        bg.style.filter = 'none';
        bg.style.transform = 'scale(1)';
      }
    }

    document.querySelectorAll('.cell-img').forEach(img => {
      const cell = img.closest('.template-cell');
      if (cell) {
        const idx = cell.dataset.cellIndex;
        const cellFilter = window.State.cellFilters[idx];
        if (cellFilter) {
          img.style.filter = this.getFilterString(cellFilter);
        } else {
          img.style.filter = str || 'none';
        }
      } else {
        img.style.filter = str || 'none';
      }
    });
  },

  // Aplica filtro APENAS numa célula específica
  applyCellFilter(cellIndex) {
    if (cellIndex === undefined || cellIndex === null) cellIndex = window.State.activeCell;
    if (cellIndex === null || cellIndex === undefined) return;
    const grid = document.getElementById('gridCells');
    if (!grid) return;
    const cells = grid.querySelectorAll('.template-cell');
    if (!cells[cellIndex]) return;

    const cell = cells[cellIndex];
    const img = cell.querySelector('.cell-img');
    if (!img) return;

    const cellFilter = window.State.cellFilters[cellIndex];
    // Se tem filtro salvo na célula, usa ele; senão usa o estado global
    const active = cellFilter || window.State;
    img.style.filter = this.getFilterString(active);
  },

  // Salva o filtro atual como filtro individual da célula
  saveCellFilter(cellIndex) {
    window.State.cellFilters[cellIndex] = {
      _preset: window.State._preset,
      brightness: window.State.brightness,
      contrast:   window.State.contrast,
      exposure:   window.State.exposure,
      shadows:    window.State.shadows,
      highlights: window.State.highlights,
      temperature:window.State.temperature,
      tint:       window.State.tint,
      saturation: window.State.saturation,
      clarity:    window.State.clarity,
    };
  },

  // Seleciona uma célula do grid para edição individual
  selectCell(cellIndex) {
    document.querySelectorAll('.template-cell.selected').forEach(c => {
      c.classList.remove('selected');
      c.style.borderColor = '';
    });

    const grid = document.getElementById('gridCells');
    if (!grid) return;
    const cells = grid.querySelectorAll('.template-cell');
    if (!cells[cellIndex]) return;

    cells[cellIndex].classList.add('selected');
    cells[cellIndex].style.borderColor = 'rgba(233, 196, 106, 0.9)';
    window.State.activeCell = cellIndex;
    this.syncSliders();
  },

  // Reaplica os filtros individuais de todas as células que têm ajuste salvo
  applyAllCellFilters() {
    const grid = document.getElementById('gridCells');
    if (!grid) return;
    const cells = grid.querySelectorAll('.template-cell');
    cells.forEach((cell, idx) => {
      const img = cell.querySelector('.cell-img');
      if (!img) return;
      const cellFilter = window.State.cellFilters[idx];
      img.style.filter = this.getFilterString(cellFilter || window.State);
    });
  },

  // Sincroniza os sliders com o estado atual (célula ativa ou global)
  syncSliders() {
    const keys = ['brightness', 'contrast', 'exposure', 'shadows', 'highlights', 'temperature', 'tint', 'saturation', 'clarity', 'zoom'];
    const src = (window.State.activeCell !== null && window.State.cellFilters[window.State.activeCell])
      ? window.State.cellFilters[window.State.activeCell]
      : window.State;
    keys.forEach(k => {
      const inp = document.getElementById(k);
      const val = document.getElementById(k + 'Val');
      const v = (k === 'zoom') ? window.State.zoom : (src[k] !== undefined ? src[k] : 100);
      if (inp) inp.value = v;
      if (val) val.textContent = v;
    });
    // O card destacado precisa refletir o preset da célula ativa, não o global
    const preset = src._preset || 'none';
    document.querySelectorAll('.filter-card').forEach(c => {
      c.classList.toggle('active', (c.dataset.filter || 'none') === preset);
    });
  },
};
