// Sistema de Histórico (Undo/Redo)
window.History = {
  stack: [],
  index: -1,
  maxSize: 50,
  restoring: false,
  labels: ['desfazer', 'refazer'],

  init() {
    this.stack = [];
    this.index = -1;
    this.setupKeyboard();
    this.setupButtons();
    // Estado inicial: sem ele o primeiro desfazer não tem para onde voltar
    this.push('init');
  },

  // Zera a pilha usando o estado atual como base. Usado depois de restaurar o
  // auto-save: sem isso o primeiro desfazer voltava para o canvas vazio de antes
  // da restauração e apagava o trabalho recuperado.
  reset(label) {
    this.stack = [];
    this.index = -1;
    this.restoring = false;
    this.push(label || 'init');
  },

  push(action) {
    // Restaurar um estado não deve gerar novos estados
    if (this.restoring) return;

    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }

    const labelMap = {
      'property-change': 'Ajuste',
      'filter-change': 'Filtro',
      'delete': 'Excluir',
      'text-edit': 'Texto',
      'resize': 'Redimensionar',
      'add-element': 'Adicionar',
      'clear': 'Limpar',
      'cell-filter': 'Filtro célula',
      'move': 'Mover',
      'reorder': 'Reordenar',
      'duplicate': 'Duplicar',
      'style-change': 'Estilo',
      'change-background': 'Fundo',
      'init': 'Início',
      'add-photo': 'Foto',
      'template-change': 'Modelo',
      'load-project': 'Projeto aberto',
    };
    const label = labelMap[action] || action;

    this.stack.push({
      timestamp: Date.now(),
      action: action,
      label: label,
      elements: this.captureState()
    });

    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
    this.index = this.stack.length - 1;

    this.updateUI();
    this.renderList();
  },

  ADJUST_KEYS: ['brightness', 'contrast', 'exposure', 'shadows', 'highlights',
    'temperature', 'tint', 'saturation', 'clarity', 'zoom'],

  captureState() {
    const elements = [];
    document.querySelectorAll('#elements > [data-el]').forEach(el => {
      elements.push({
        id: el.id,
        type: el.dataset.el,
        html: el.innerHTML,
        text: el.childElementCount === 0 ? el.textContent : '',
        style: el.style.cssText,
        className: (el.className || '').replace(/\bel-selected\b/g, '').trim(),
        rotation: el.dataset.rotation || '',
        locked: el.dataset.locked === 'true',
        visible: el.dataset.visible !== 'false'
      });
    });

    const adjustments = {};
    this.ADJUST_KEYS.forEach(k => {
      adjustments[k] = window.State[k] ?? 100;
    });

    // Fotos das células do template: sem isso, desfazer perdia as imagens do grid
    const cells = [];
    document.querySelectorAll('#gridCells .template-cell').forEach(cell => {
      const img = cell.querySelector('.cell-img');
      cells.push(img ? img.getAttribute('src') : null);
    });

    return {
      elements: elements,
      cells: cells,
      template: window.Templates?.current || 'empty',
      background: document.getElementById('bg')?.getAttribute('src') || '',
      filter: window.State.filter || 'none',
      preset: window.State._preset || 'none',
      adjustments: adjustments,
      activeCell: window.State.activeCell,
      cellFilters: JSON.parse(JSON.stringify(window.State.cellFilters || {}))
    };
  },

  restoreState(state) {
    if (!state) return;
    this.restoring = true;
    try {
      this._restore(state);
    } finally {
      this.restoring = false;
    }
  },

  _restore(state) {
    const elementsContainer = document.getElementById('elements');
    if (elementsContainer) {
      elementsContainer.innerHTML = '';

      if (state.elements) {
        state.elements.forEach(elData => {
          const el = document.createElement('div');
          el.id = elData.id || 'el-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
          el.dataset.el = elData.type;
          if (elData.className) el.className = elData.className;
          if (elData.html) el.innerHTML = elData.html;
          else if (elData.text) el.textContent = elData.text;
          el.style.cssText = elData.style || '';
          if (elData.rotation) el.dataset.rotation = elData.rotation;
          if (elData.locked) el.dataset.locked = 'true';
          if (elData.visible === false) {
            el.dataset.visible = 'false';
            el.style.display = 'none';
          }
          elementsContainer.appendChild(el);
          // Sem isto os elementos restaurados ficam imóveis
          if (window.Elements?.hydrate) window.Elements.hydrate(el);
        });
      }
    }

    // A seleção anterior aponta para um nó removido
    window.State.selected = null;
    const stylePanel = document.getElementById('panel-style');
    if (stylePanel) stylePanel.style.display = 'none';
    const propsPanel = document.getElementById('panel-properties');
    if (propsPanel) propsPanel.style.display = 'none';
    if (window.Resize?.hideHandles) window.Resize.hideHandles();

    const bg = document.getElementById('bg');
    if (bg && state.background) bg.src = state.background;

    if (state.filter !== undefined) window.State.filter = state.filter;
    if (state.preset !== undefined) window.State._preset = state.preset;

    if (state.adjustments) {
      Object.keys(state.adjustments).forEach(key => {
        const v = state.adjustments[key];
        window.State[key] = v;
        const input = document.getElementById(key);
        const out = document.getElementById(key + 'Val');
        if (input) input.value = v;
        if (out) out.textContent = v;
      });
    }

    if (state.activeCell !== undefined) window.State.activeCell = state.activeCell;
    if (state.cellFilters !== undefined) window.State.cellFilters = state.cellFilters;

    // Se o template mudou, recria o grid antes de devolver as fotos
    if (state.template && window.Templates && window.Templates.current !== state.template) {
      const filtersBackup = window.State.cellFilters;
      const activeBackup = window.State.activeCell;
      window.Templates.render(state.template);
      window.State.cellFilters = filtersBackup;
      window.State.activeCell = activeBackup;
      document.querySelectorAll('.template-card').forEach(c => {
        c.classList.toggle('active', c.dataset.template === state.template);
      });
    }

    // Restaura as fotos das células
    if (Array.isArray(state.cells)) {
      const cellEls = document.querySelectorAll('#gridCells .template-cell');
      state.cells.forEach((src, i) => {
        const cell = cellEls[i];
        if (!cell) return;
        const existing = cell.querySelector('.cell-img');
        if (!src) {
          if (existing) existing.remove();
          delete cell.dataset.hasImage;
          const icon = cell.querySelector('.cell-icon');
          if (icon) icon.textContent = '+';
          return;
        }
        if (existing) {
          if (existing.getAttribute('src') !== src) existing.src = src;
        } else if (window.Templates?.addImageToCell) {
          window.Templates.addImageToCell(i, src);
        }
      });
    }

    // Reaplica preset visual + filtros de célula
    document.querySelectorAll('.filter-card').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === (state.preset || 'none'));
    });
    // Destaque da célula ativa: sem isto o grid volta sem marcação nenhuma
    document.querySelectorAll('#gridCells .template-cell').forEach((c, i) => {
      const on = String(i) === String(window.State.activeCell);
      c.classList.toggle('selected', on);
      c.style.borderColor = on ? 'rgba(233, 196, 106, 0.9)' : '';
    });
    if (window.Filters?.apply) window.Filters.apply();
    if (window.Filters?.applyAllCellFilters) window.Filters.applyAllCellFilters();
    if (window.Filters?.syncSliders) window.Filters.syncSliders();
    if (bg) bg.style.transform = `scale(${(window.State.zoom || 100) / 100})`;
    if (window.Layers?.render) window.Layers.render();
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (typeof updateCellFilterHint === 'function') updateCellFilterHint();

    this.updateUI();
    this.renderList();
  },

  undo() {
    if (this.index > 0) {
      this.index--;
      this.restoreState(this.stack[this.index].elements);
      if (window.showToast) window.showToast('Desfeito: ' + this.stack[this.index + 1].label, 1400, 'info');
      return true;
    }
    if (window.showToast) window.showToast('Nada para desfazer', 1400, 'info');
    return false;
  },

  redo() {
    if (this.index < this.stack.length - 1) {
      this.index++;
      this.restoreState(this.stack[this.index].elements);
      if (window.showToast) window.showToast('Refeito: ' + this.stack[this.index].label, 1400, 'info');
      return true;
    }
    if (window.showToast) window.showToast('Nada para refazer', 1400, 'info');
    return false;
  },

  canUndo() {
    return this.index > 0;
  },

  canRedo() {
    return this.index < this.stack.length - 1;
  },

  updateUI() {
    const undoBtn = document.getElementById('btnUndo');
    const redoBtn = document.getElementById('btnRedo');

    if (undoBtn) {
      undoBtn.disabled = !this.canUndo();
      undoBtn.style.opacity = this.canUndo() ? '1' : '0.4';
    }
    if (redoBtn) {
      redoBtn.disabled = !this.canRedo();
      redoBtn.style.opacity = this.canRedo() ? '1' : '0.4';
    }
  },

  renderList() {
    const list = document.getElementById('historyList');
    if (!list) return;

    list.innerHTML = '';
    if (this.stack.length === 0) {
      list.innerHTML = '<p style="opacity:0.5;font-size:12px;">Nenhuma ação ainda</p>';
      return;
    }

    const start = Math.max(0, this.index - 5);
    const end = Math.min(this.stack.length, this.index + 1);

    for (let i = start; i < end; i++) {
      const entry = this.stack[i];
      const div = document.createElement('div');
      div.className = 'history-entry' + (i === this.index ? ' active' : '');
      const time = new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const action = document.createElement('span');
      action.className = 'history-action';
      action.textContent = entry.label;
      const stamp = document.createElement('span');
      stamp.className = 'history-time';
      stamp.textContent = time;
      div.appendChild(action);
      div.appendChild(stamp);

      div.title = 'Voltar para este ponto';
      div.addEventListener('click', () => {
        this.index = i;
        this.restoreState(this.stack[i].elements);
      });
      list.appendChild(div);
    }
  },

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      const typing = !!(t && (t.isContentEditable ||
        (typeof t.matches === 'function' && t.matches('input, textarea, select'))));
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      }
    });
  },

  setupButtons() {
    const undoBtn = document.getElementById('btnUndo');
    const redoBtn = document.getElementById('btnRedo');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.redo());
    }
  }
};
