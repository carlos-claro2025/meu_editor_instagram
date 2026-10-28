// Sistema de Camadas
window.Layers = {
  init() {
    this.render();
    this.setupEvents();
  },

  render() {
    const list = document.getElementById('layerList');
    if (!list) return;

    list.innerHTML = '';
    const elements = Array.from(document.querySelectorAll('#elements > [data-el]'));

    if (elements.length === 0) {
      list.innerHTML = '<p style="opacity:0.5;font-size:12px;">Nenhuma camada</p>';
      return;
    }

    const renderItem = (el, depth = 0) => {
      const item = document.createElement('div');
      const selected = window.State.selectedElements || [];
      item.className = 'layer-item' + (window.State.selected === el || selected.includes(el) ? ' active' : '');
      if (el.dataset.visible === 'false') item.classList.add('layer-hidden');
      if (el.dataset.locked === 'true') item.classList.add('layer-locked');
      item.dataset.targetId = el.id;
      item.style.paddingLeft = `${12 + depth * 20}px`;

      const typeLabel = this.getTypeLabel(el.dataset.el);
      const raw = (el.textContent || '').trim();
      const displayName = el.dataset.name || (raw ? raw.substring(0, 18) : typeLabel);
      const isVisible = el.dataset.visible !== 'false';
      const isLocked = el.dataset.locked === 'true';

      const icon = document.createElement('div');
      icon.className = 'layer-icon';
      if (el.dataset.el === 'image' && el.querySelector('img')?.src) {
        icon.style.backgroundImage = `url("${el.querySelector('img').src}")`;
        icon.style.backgroundSize = 'cover';
        icon.textContent = '';
      } else {
        icon.textContent = this.getTypeIcon(el.dataset.el);
      }

      // textContent em vez de innerHTML: nome do usuário não vira HTML
      const nameEl = document.createElement('div');
      nameEl.className = 'layer-name';
      nameEl.textContent = displayName;
      nameEl.title = displayName;

      const actions = document.createElement('div');
      actions.className = 'layer-actions';
      [
        ['visibility', isVisible ? '👁' : '🚫', isVisible ? 'Ocultar' : 'Mostrar'],
        ['lock', isLocked ? '🔒' : '🔓', isLocked ? 'Desbloquear' : 'Bloquear'],
        ['delete', '🗑', 'Excluir']
      ].forEach(([action, label, title]) => {
        const b = document.createElement('button');
        b.className = 'layer-btn' + (action === 'delete' ? ' layer-delete' : '');
        b.dataset.action = action;
        b.title = title;
        b.textContent = label;
        actions.appendChild(b);
      });

      item.appendChild(icon);
      item.appendChild(nameEl);
      item.appendChild(actions);
      item.draggable = true;
      item.title = 'Clique para selecionar; duplo clique para renomear';

      list.appendChild(item);
      if (el.dataset.group === 'true') {
        Array.from(el.children).slice().reverse().forEach(child => renderItem(child, depth + 1));
      }
    };

    elements.slice().reverse().forEach(el => renderItem(el));
  },

  getTypeIcon(type) {
    const icons = { text: 'T', sticker: '★', shape: '■', line: '/', image: '🖼', video: '▶', group: '▰' };
    return icons[type] || '?';
  },

  getTypeLabel(type) {
    const labels = { text: 'Texto', sticker: 'Adesivo', shape: 'Forma', line: 'Linha', image: 'Foto' };
    return labels[type] || type;
  },

  getLayerElement(index) {
    const elements = Array.from(document.querySelectorAll('#elements > [data-el]'));
    return elements[index] || null;
  },

  getElementById(id) {
    return id ? document.getElementById(id) : null;
  },

  setupEvents() {
    const list = document.getElementById('layerList');
    if (!list) return;

    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.layer-btn');
      const item = e.target.closest('.layer-item');

      if (btn && item) {
        const action = btn.dataset.action;
        const el = this.getElementById(item.dataset.targetId);
        if (!el) return;

        switch (action) {
          case 'visibility':
            this.toggleVisibility(el);
            break;
          case 'lock':
            this.toggleLock(el);
            break;
          case 'delete':
            this.deleteLayer(el);
            break;
        }
      } else if (item) {
        const el = this.getElementById(item.dataset.targetId);
        if (el) {
          const additive = e.ctrlKey || e.metaKey || e.shiftKey;
          if (!additive) window.State.selectedElements = [];
          const current = window.State.selectedElements || [];
          if (additive && current.includes(el)) {
            window.State.selectedElements = current.filter(item => item !== el);
          } else {
            window.State.selectedElements = [...current.filter(item => item.isConnected), el];
          }
          window.State.selected = el;
          this.render();
          if (window.Elements?.showPanel) window.Elements.showPanel(el);
          if (window.Resize?.showHandles) window.Resize.showHandles(el);
        }
      }
    });

    list.addEventListener('dblclick', (e) => {
      const item = e.target.closest('.layer-item');
      if (!item || e.target.closest('.layer-btn')) return;
      const el = this.getElementById(item.dataset.targetId);
      if (!el) return;
      const name = prompt('Nome da camada:', el.dataset.name || this.getTypeLabel(el.dataset.el));
      if (name?.trim()) {
        el.dataset.name = name.trim();
        this.render();
        if (window.History?.push) window.History.push('rename-layer');
      }
    });

    // Reordenar camadas arrastando na lista
    let dragId = null;

    list.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.layer-item');
      if (!item) return;
      dragId = item.dataset.targetId;
      item.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragId);
      }
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const item = e.target.closest('.layer-item');
      list.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drop-target'));
      if (item && item.dataset.targetId !== dragId) {
        item.classList.add('drop-target');
      }
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });

    list.addEventListener('dragleave', (e) => {
      const item = e.target.closest('.layer-item');
      if (item) item.classList.remove('drop-target');
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const item = e.target.closest('.layer-item');
      list.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drop-target', 'dragging'));
      if (!item || !dragId || item.dataset.targetId === dragId) return;
      this.reorderById(dragId, item.dataset.targetId);
      dragId = null;
      if (window.History?.push) window.History.push('reorder');
    });

    list.addEventListener('dragend', () => {
      list.querySelectorAll('.layer-item').forEach(i => i.classList.remove('drop-target', 'dragging'));
      dragId = null;
    });
  },

  toggleVisibility(el) {
    const isHidden = el.dataset.visible === 'false';
    el.dataset.visible = isHidden ? 'true' : 'false';
    el.style.display = isHidden ? '' : 'none';
    this.render();
  },

  toggleLock(el) {
    const locked = el.dataset.locked === 'true';
    el.dataset.locked = locked ? 'false' : 'true';
    // Ao bloquear, tira a seleção e as alças para não haver edição fantasma
    if (!locked && (window.State.selected === el || window.State.selectedElements?.includes(el))) {
      window.State.selected = null;
      window.State.selectedElements = (window.State.selectedElements || []).filter(item => item !== el);
      if (window.Resize?.hideHandles) window.Resize.hideHandles();
      const ps = document.getElementById('panel-style');
      if (ps) ps.style.display = 'none';
    }
    this.render();
  },

  deleteLayer(el) {
    if (confirm('Excluir esta camada?')) {
      el.remove();
      if (window.State.selected === el) {
        window.State.selected = null;
        if (window.Resize?.hideHandles) window.Resize.hideHandles();
        const ps = document.getElementById('panel-style');
        if (ps) ps.style.display = 'none';
      }
      this.render();
      if (window.History?.push) window.History.push('delete');
      if (typeof updateStatusBar === 'function') updateStatusBar();
    }
  },

  reorder(fromIndex, toIndex) {
    const elements = Array.from(document.querySelectorAll('#elements > [data-el]'));
    if (fromIndex < 0 || fromIndex >= elements.length) return;
    const [moved] = elements.splice(fromIndex, 1);
    elements.splice(Math.max(0, Math.min(elements.length, toIndex)), 0, moved);
    const container = document.getElementById('elements');
    elements.forEach(el => container.appendChild(el));
    this.render();
  },

  reorderById(fromId, toId) {
    const from = document.getElementById(fromId);
    const to = document.getElementById(toId);
    if (!from || !to || from.parentElement !== to.parentElement) return;
    const parent = from.parentElement;
    const siblings = Array.from(parent.children);
    const fromIndex = siblings.indexOf(from);
    const targetIndex = siblings.indexOf(to);
    if (targetIndex < 0) return;
    parent.insertBefore(from, fromIndex < targetIndex ? to.nextSibling : to);
    this.render();
  }
};
