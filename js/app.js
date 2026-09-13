// Sistema completo de edição - Integrado com todos os sistemas

function switchTab(panel) {
  const tabs = document.querySelectorAll('.tab');
  const sections = document.querySelectorAll('.tool-section[id^="panel-"]');
  tabs.forEach(t => t.classList.remove('active'));
  sections.forEach(s => s.style.display = 'none');
  const activeTab = document.querySelector('.tab[data-panel="' + panel + '"]');
  if (activeTab) activeTab.classList.add('active');
  const panelEl = document.getElementById('panel-' + panel);
  if (panelEl) panelEl.style.display = 'block';
}

function showToast(msg, duration, type) {
  duration = duration || 2000;
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('toast-success', 'toast-error', 'toast-info');
  if (type) toast.classList.add('toast-' + type);
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
}
window.showToast = showToast;

function updateStatusBar() {
  const layersEl = document.getElementById('statusLayers');
  const filtersEl = document.getElementById('statusFilters');
  if (layersEl) layersEl.textContent = 'Camadas: ' + document.querySelectorAll('#elements > [data-el]').length;
  if (filtersEl) {
    const names = { none: 'Original', grayscale: 'P&B', sepia: 'Amarelo', warm: 'Vermelho', vivid: 'Vivid', cool: 'Cool', dramatic: 'Dramático', fade: 'Fade' };
    filtersEl.textContent = 'Filtro: ' + (names[window.State.filter] || window.State.filter);
  }
}

function updateCellFilterHint() {
  const hint = document.getElementById('cellFilterHint');
  const hintNum = document.getElementById('cellFilterHintNum');
  if (hint) {
    hint.style.display = window.State.activeCell !== null ? 'block' : 'none';
    if (hintNum) hintNum.textContent = window.State.activeCell !== null ? (Number(window.State.activeCell) + 1) : '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('App initializing...');

  // Remove o overlay de carregamento ao final do DOM, mesmo se algum modulo falhar
  const hideOverlay = () => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  };

  // Um módulo com falha não deve derrubar o editor inteiro
  const boot = (name, fn) => {
    try { fn(); } catch (err) { console.error('Falha ao iniciar ' + name + ':', err); }
  };
  boot('Templates', () => Templates.init());
  boot('Filters', () => Filters.init());
  boot('Elements', () => Elements.init());
  boot('DragDrop', () => DragDrop.init());
  boot('Export', () => Export.init());
  boot('MusicPlayer', () => window.MusicPlayer?.init());
  boot('History', () => History.init());
  boot('Layers', () => Layers.init());
  boot('Resize', () => Resize.init());
  boot('Project', () => Project.init());

  // Garante que o overlay suma depois de todos os modulos
  hideOverlay();

  // Navegação por abas
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const panelMap = { templates: 'templates', midia: 'feed', feed: 'feed', elementos: 'add', texto: 'add', musica: 'musica', ajustes: 'ajustes' };
      const panel = panelMap[item.dataset.nav];
      if (panel) switchTab(panel);
    });
  });

  // Navegação por painéis laterais
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.panel));
  });

  // Limpar
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    if (confirm('Limpar todo o canvas? Isso removerá todos os elementos e fotos.')) {
      const el = document.getElementById('elements');
      if (el) el.innerHTML = '';
      const grid = document.getElementById('gridCells');
      if (grid) { grid.innerHTML = ''; grid.style.display = 'none'; grid.classList.remove('show'); }
      window.State.selected = null;
      window.State.activeCell = null;
      document.querySelectorAll('.template-cell').forEach(c => { c.classList.remove('selected'); c.style.borderColor = ''; });
      const ps = document.getElementById('panel-style'); if (ps) ps.style.display = 'none';
      Resize.hideHandles();
      Layers.render();
      History.push('clear');
      updateStatusBar();
      showToast('Canvas limpo');
    }
  });

  // Salvar: botão principal salva no navegador; a seta abre as opções
  const saveMenu = document.getElementById('saveMenu');
  const exportMenu = document.getElementById('exportMenu');
  const closeMenus = () => {
    if (saveMenu) saveMenu.style.display = 'none';
    if (exportMenu) exportMenu.style.display = 'none';
  };

  document.getElementById('saveBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenus();
    Project.saveCurrentProject();
  });
  document.getElementById('saveDropdownBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = saveMenu && saveMenu.style.display !== 'none';
    closeMenus();
    if (saveMenu && !open) saveMenu.style.display = 'block';
  });
  document.querySelectorAll('#saveMenu [data-save]').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenus();
      switch (e.currentTarget.dataset.save) {
        case 'browser': Project.saveCurrentProject(); break;
        case 'json': Export.save(); break;
        case 'import': document.getElementById('importJsonInput')?.click(); break;
      }
    });
  });

  // Importar o .json gerado pelo "Salvar → Arquivo .json"
  document.getElementById('importJsonInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Export.load(JSON.parse(String(reader.result)));
      } catch (err) {
        console.error(err);
        showToast('Arquivo de projeto inválido', 3000, 'error');
      }
    };
    reader.onerror = () => showToast('Não foi possível ler o arquivo', 3000, 'error');
    reader.readAsText(file);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.export-dropdown')) closeMenus();
  });

  document.getElementById('previewBtn')?.addEventListener('click', () => Export.preview());

  // Exportar imagem
  document.getElementById('exportBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenus();
    Export.exportImage('png');
  });
  document.getElementById('exportDropdownBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = exportMenu && exportMenu.style.display !== 'none';
    closeMenus();
    if (exportMenu && !open) exportMenu.style.display = 'block';
  });
  document.querySelectorAll('#exportMenu .export-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenus();
      Export.exportImage(e.currentTarget.dataset.format);
    });
  });

  // Ajuda / atalhos
  document.getElementById('helpBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'flex';
  });
  document.getElementById('shortcutsClose')?.addEventListener('click', () => {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'none';
  });
  document.getElementById('shortcutsCloseFooter')?.addEventListener('click', () => {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'none';
  });
  document.getElementById('shortcutsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'shortcutsModal') e.target.style.display = 'none';
  });

  // Botões rápidos
  document.querySelectorAll('.quick-btn').forEach(btn => {
    const run = () => {
      switch (btn.dataset.action) {
        case 'add-text': Elements.createText('Título'); break;
        case 'add-sticker':
        // Open sticker selection modal
        const modal = document.getElementById('stickerModal');
        if (modal) modal.style.display = 'block';
        break;
        case 'add-shape': Elements.createShape(); break;
        case 'add-line': Elements.createLine(); break;
      }
      // History.push('add-element');
      updateStatusBar();
    };
    btn.addEventListener('click', run);
    btn.setAttribute('role', 'button');
    btn.tabIndex = 0;
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); }
    });
  });

  // Upload de fotos
  document.getElementById('uploadBtn')?.addEventListener('click', () => document.getElementById('fileInput')?.click());
  document.getElementById('fileInput')?.addEventListener('change', (e) => {
    let added = 0;
    Array.from(e.target.files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) { showToast('“' + file.name + '” passa de 10 MB', 3000, 'error'); return; }
      window.State.addFeedImage(URL.createObjectURL(file), file.name);
      added++;
    });
    if (added) showToast(added + (added > 1 ? ' fotos adicionadas' : ' foto adicionada'), 2000, 'success');
    // Permite reescolher o mesmo arquivo depois
    e.target.value = '';
  });

  // Propriedades do elemento (X/Y são o canto superior esquerdo, como mostrado no painel)
  const applyProp = (id, rawVal) => {
    const el = window.State.selected;
    if (!el) return;
    const val = parseFloat(rawVal);
    if (Number.isNaN(val)) return;
    const rect = el.getBoundingClientRect();
    const parentRect = el.parentElement.getBoundingClientRect();
    const phoneRect = document.getElementById('phone')?.getBoundingClientRect() || parentRect;
    const offX = phoneRect.left - parentRect.left;
    const offY = phoneRect.top - parentRect.top;

    switch (id) {
      // O elemento é ancorado no centro (translate -50%), então converte canto → centro
      case 'propX': el.style.left = (val + offX + rect.width / 2) + 'px'; break;
      case 'propY': el.style.top = (val + offY + rect.height / 2) + 'px'; break;
      case 'propW':
        if (el.dataset.el === 'text' || el.dataset.el === 'sticker') return;
        el.style.width = Math.max(1, val) + 'px';
        break;
      case 'propH':
        if (el.dataset.el === 'text' || el.dataset.el === 'sticker' || el.dataset.el === 'line') return;
        el.style.height = Math.max(1, val) + 'px';
        break;
      case 'propRot':
        el.dataset.rotation = val;
        el.style.transform = 'translate(-50%, -50%) rotate(' + val + 'deg)';
        break;
      case 'propOpac':
        el.style.opacity = Math.max(0, Math.min(100, val)) / 100;
        break;
    }
    if (window.Resize?.reposition) window.Resize.reposition();
  };

  ['propX', 'propY', 'propW', 'propH', 'propRot', 'propOpac'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', (e) => applyProp(id, e.target.value));
    // Histórico só no commit, para não gerar um passo por tecla digitada
    input.addEventListener('change', () => {
      if (!window.State.selected) return;
      Layers.render();
      History.push('property-change');
    });
  });

  document.getElementById('propFilter')?.addEventListener('change', (e) => {
    const el = window.State.selected;
    if (!el) { showToast('Selecione um elemento primeiro', 2000, 'info'); return; }
    // O select guarda o nome do preset; converte para CSS filter válido
    const preset = e.target.value;
    const css = preset === 'none' ? 'none' : window.State.getFilterString({ _preset: preset });
    const img = el.querySelector('img');
    if (img) img.style.filter = css; else el.style.filter = css;
    History.push('filter-change');
  });

  // Remover elemento
  function deleteSelected() {
    const el = window.State.selected;
    if (!el) { showToast('Selecione um elemento primeiro', 2000, 'info'); return; }
    el.remove();
    window.State.selected = null;
    const ps = document.getElementById('panel-style'); if (ps) ps.style.display = 'none';
    const pp = document.getElementById('panel-properties'); if (pp) pp.style.display = 'none';
    Resize.hideHandles();
    Layers.render();
    History.push('delete');
    updateStatusBar();
    showToast('Elemento removido', 1400, 'info');
  }
  document.getElementById('deleteSelectedBtn')?.addEventListener('click', deleteSelected);

  // Seleção de elementos
  document.getElementById('phone')?.addEventListener('click', (e) => {
    const el = e.target.closest('[data-el]');
    if (el) {
      if (el.dataset.locked === 'true') return;
      window.State.selected = el;
      Elements.showPanel(el);
      Resize.showHandles(el);
      Layers.render();
      updateStatusBar();
    } else if (e.target.id === 'phone' || e.target.classList.contains('bg')) {
      window.State.selected = null;
      window.State.activeCell = null;
      document.querySelectorAll('.template-cell.selected').forEach(c => c.classList.remove('selected'));
      const ps = document.getElementById('panel-style'); if (ps) ps.style.display = 'none';
      Resize.hideHandles();
      Layers.render();
      updateCellFilterHint();
      window.Filters.syncSliders();
      updateStatusBar();
    }
  });

  // Teclado
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = !!(t && (t.isContentEditable ||
      (typeof t.matches === 'function' && t.matches('input, textarea, select'))));
    if (typing) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && window.State.selected) {
      e.preventDefault();
      deleteSelected();
      return;
    }

    if (e.key === 'Escape') {
      // Modal aberto: Esc fecha o modal antes de mexer na seleção
      const openModal = [...document.querySelectorAll('#shortcutsModal, #projectListModal')]
        .find(m => m.style.display && m.style.display !== 'none');
      if (openModal) { openModal.style.display = 'none'; return; }
      window.State.selected = null;
      window.State.activeCell = null;
      document.querySelectorAll('.template-cell.selected').forEach(c => c.classList.remove('selected'));
      const ps = document.getElementById('panel-style'); if (ps) ps.style.display = 'none';
      const pp = document.getElementById('panel-properties'); if (pp) pp.style.display = 'none';
      Resize.hideHandles();
      Layers.render();
      updateCellFilterHint();
      return;
    }

    if (window.State.selected && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const sel = window.State.selected;
      // Normaliza para px: a seta precisa somar na mesma unidade do estilo atual
      if ((sel.style.left || '').indexOf('%') !== -1 || !sel.style.left) {
        const rect = sel.getBoundingClientRect();
        const parentRect = sel.parentElement.getBoundingClientRect();
        sel.style.left = (rect.left - parentRect.left + rect.width / 2) + 'px';
        sel.style.top = (rect.top - parentRect.top + rect.height / 2) + 'px';
      }
      const curL = parseFloat(sel.style.left) || 0;
      const curT = parseFloat(sel.style.top) || 0;
      switch (e.key) {
        case 'ArrowUp': sel.style.top = (curT - step) + 'px'; break;
        case 'ArrowDown': sel.style.top = (curT + step) + 'px'; break;
        case 'ArrowLeft': sel.style.left = (curL - step) + 'px'; break;
        case 'ArrowRight': sel.style.left = (curL + step) + 'px'; break;
      }
      Resize.reposition();
      Resize.updatePropertiesPanel();
      clearTimeout(window._arrowHistoryTimer);
      // Um passo de histórico por rajada de setas, não por tecla
      window._arrowHistoryTimer = setTimeout(() => History.push('move'), 400);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      if (!window.State.selected) { showToast('Selecione um elemento primeiro', 2000, 'info'); return; }
      Elements.duplicateSelected();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      Project.saveCurrentProject();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      Export.exportImage('png');
      return;
    }

    if (!e.ctrlKey && !e.metaKey && (e.key === '?' || (e.key === '/' && e.shiftKey))) {
      e.preventDefault();
      const help = document.getElementById('shortcutsModal');
      if (help) help.style.display = help.style.display === 'flex' ? 'none' : 'flex';
    }
  });

  // Toggle proporção Story/Post
  document.querySelectorAll('.overlay-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.overlay-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const ratio = chip.dataset.ratio;
      window.State.ratio = ratio;
      const phone = document.getElementById('phone');
      if (phone) phone.style.aspectRatio = ratio === '1:1' ? '1/1' : '9/16';
      const label = document.getElementById('ratioLabel');
      if (label) label.textContent = ratio === '1:1' ? 'Post • 1:1' : 'Story • 9:16';
      const sr = document.getElementById('statusRatio');
      if (sr) sr.textContent = 'Proporção: ' + ratio;
      // A proporção muda o tamanho do canvas: as alças precisam acompanhar
      Resize.reposition();
    });
  });

  // Auto-save no localStorage
  const AUTOSAVE_KEY = 'storyMaker_lastProject';
  const ADJ_KEYS = ['brightness', 'contrast', 'exposure', 'shadows', 'highlights',
    'temperature', 'tint', 'saturation', 'clarity', 'zoom'];

  (function restoreAutosave() {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);

      const container = document.getElementById('elements');
      if (container && data.elements) {
        container.innerHTML = '';
        data.elements.forEach(d => {
          const el = document.createElement('div');
          el.id = d.id || 'el-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
          el.dataset.el = d.type;
          if (d.html) el.innerHTML = d.html;
          else el.textContent = d.content || '';
          el.style.cssText = d.style || '';
          if (d.rotation) el.dataset.rotation = d.rotation;
          if (d.locked) el.dataset.locked = 'true';
          container.appendChild(el);
          Elements.hydrate(el);
        });
      }

      // blob: URLs não sobrevivem ao recarregamento — só restaura data URLs
      if (data.background && data.background.indexOf('blob:') !== 0) {
        const bg = document.getElementById('bg');
        if (bg) bg.src = data.background;
      }

      if (data.ratio) {
        window.State.ratio = data.ratio;
        const phone = document.getElementById('phone');
        if (phone) phone.style.aspectRatio = data.ratio === '1:1' ? '1/1' : '9/16';
        document.querySelectorAll('.overlay-chip').forEach(c => {
          c.classList.toggle('active', c.dataset.ratio === data.ratio);
        });
        const label = document.getElementById('ratioLabel');
        if (label) label.textContent = data.ratio === '1:1' ? 'Post • 1:1' : 'Story • 9:16';
        const sr = document.getElementById('statusRatio');
        if (sr) sr.textContent = 'Proporção: ' + data.ratio;
      }

      if (data.filter) window.State.filter = data.filter;
      if (data.preset) window.State._preset = data.preset;
      document.querySelectorAll('.filter-card').forEach(c => {
        c.classList.toggle('active', (c.dataset.filter || 'none') === (window.State._preset || 'none'));
      });

      ADJ_KEYS.forEach(key => {
        if (data[key] === undefined) return;
        window.State[key] = data[key];
        const inp = document.getElementById(key);
        const val = document.getElementById(key + 'Val');
        if (inp) inp.value = data[key];
        if (val) val.textContent = data[key];
      });

      if (data.cellFilters) window.State.cellFilters = data.cellFilters;

      // Recria o grid escolhido (render zera cellFilters, então vem antes)
      if (data.template && data.template !== 'empty' && window.Templates?.render) {
        const filtersBackup = window.State.cellFilters;
        window.Templates.render(data.template);
        window.State.cellFilters = filtersBackup;
        document.querySelectorAll('.template-card').forEach(c => {
          c.classList.toggle('active', c.dataset.template === data.template);
        });
        if (Array.isArray(data.cells)) {
          data.cells.forEach((src, i) => {
            if (src && src.indexOf('blob:') !== 0) Templates.addImageToCell(i, src);
          });
        }
      }

      window.Filters.apply();
      const bgEl = document.getElementById('bg');
      if (bgEl) bgEl.style.transform = `scale(${(window.State.zoom || 100) / 100})`;
      Layers.render();

      const pn = document.getElementById('projectName');
      if (pn) pn.textContent = 'Projeto restaurado';
      // A pilha do histórico foi criada com o canvas vazio: rebase nela o estado
      // restaurado, senão o primeiro Ctrl+Z apagaria tudo que acabou de voltar.
      if (window.History?.reset) window.History.reset('restored');
    } catch (e) {
      console.warn('Falha ao restaurar auto-save:', e);
    }
  })();

  function saveAutosave() {
    try {
      const els = [];
      document.querySelectorAll('#elements > [data-el]').forEach(el => {
        els.push({
          id: el.id,
          type: el.dataset.el,
          html: el.childElementCount ? el.innerHTML : '',
          content: el.childElementCount ? '' : el.textContent,
          style: el.style.cssText,
          rotation: el.dataset.rotation || '',
          locked: el.dataset.locked === 'true'
        });
      });
      const bgSrc = document.getElementById('bg')?.getAttribute('src') || '';
      const cells = Array.from(document.querySelectorAll('#gridCells .template-cell')).map(c => {
        const src = c.querySelector('.cell-img')?.getAttribute('src') || null;
        return src && src.indexOf('blob:') === 0 ? null : src;
      });
      const payload = {
        elements: els,
        background: bgSrc.indexOf('blob:') === 0 ? '' : bgSrc,
        template: window.Templates?.current || 'empty',
        cells: cells,
        ratio: window.State.ratio,
        filter: window.State.filter,
        preset: window.State._preset,
        cellFilters: window.State.cellFilters
      };
      ADJ_KEYS.forEach(k => { payload[k] = window.State[k]; });
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
      } catch (quota) {
        // Fotos em data URL podem estourar a cota: salva sem imagens
        payload.background = '';
        payload.cells = payload.cells.map(() => null);
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
      }
    } catch (e) {
      console.warn('Falha ao salvar auto-save:', e);
    }
  }

  setInterval(saveAutosave, 30000);
  window.addEventListener('beforeunload', saveAutosave);

  updateStatusBar();

  // Trocar foto de fundo
  document.getElementById('trocarFundoBtn')?.addEventListener('click', () => {
    document.getElementById('trocarFundoInput')?.click();
  });
  document.getElementById('trocarFundoInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Formato inválido', 2000, 'error'); return; }
    // data URL em vez de blob: assim o fundo sobrevive ao export (html2canvas
    // recarrega a imagem) e ao autosave/salvamento do projeto
    const fr = new FileReader();
    fr.onload = () => {
      const bg = document.getElementById('bg');
      if (!bg) return;
      bg.src = String(fr.result);
      showToast('Foto de fundo alterada', 1500, 'success');
      History.push('change-background');
      updateStatusBar();
    };
    fr.onerror = () => showToast('Não foi possível ler a imagem', 2200, 'error');
    fr.readAsDataURL(file);
  });
});
