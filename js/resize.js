// Resize com alças
window.Resize = {
  active: false,
  handle: null,
  target: null,
  startX: 0,
  startY: 0,
  startAngle: 0,
  startRotation: 0,
  startRect: null,
  moved: false,

  CURSORS: {
    nw: 'nwse-resize', se: 'nwse-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize'
  },

  init() {
    this.setupEvents();
  },

  setupEvents() {
    document.addEventListener('pointermove', (e) => this.onMove(e));
    document.addEventListener('pointerup', () => this.onUp());
    // As alças usam coordenadas de viewport: precisam seguir scroll/resize
    window.addEventListener('scroll', () => this.reposition(), true);
    window.addEventListener('resize', () => this.reposition());
  },

  showHandles(el) {
    this.hideHandles();
    if (!el || el.dataset.locked === 'true') return;
    this.target = el;
    el.classList.add('el-selected');

    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

    handles.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = 'resize-handle resize-' + pos;
      handle.dataset.handle = pos;
      handle.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: var(--accent, #e9c46a);
        border: 2px solid #fff;
        border-radius: 50%;
        z-index: 1000;
        touch-action: none;
        cursor: ${this.CURSORS[pos]};
      `;

      handle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResize(el, e, pos);
      });

      document.body.appendChild(handle);
    });

    // Alça de rotação
    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'rotate-handle';
    rotateHandle.textContent = '↻';
    rotateHandle.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      background: var(--accent, #e9c46a);
      border: 2px solid #fff;
      border-radius: 50%;
      cursor: grab;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #1a1a1a;
      touch-action: none;
    `;

    rotateHandle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.startRotate(el, e);
    });

    document.body.appendChild(rotateHandle);
    this.reposition();
    this.updatePropertiesPanel();
  },

  // Reposiciona as alças sobre o elemento atual
  reposition() {
    if (!this.target) return;
    if (!this.target.isConnected) { this.hideHandles(); return; }

    const rect = this.target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const posMap = {
      nw: [rect.left, rect.top],
      n:  [cx, rect.top],
      ne: [rect.right, rect.top],
      e:  [rect.right, cy],
      se: [rect.right, rect.bottom],
      s:  [cx, rect.bottom],
      sw: [rect.left, rect.bottom],
      w:  [rect.left, cy]
    };

    document.querySelectorAll('.resize-handle').forEach(h => {
      const p = posMap[h.dataset.handle];
      if (!p) return;
      h.style.left = (p[0] - 5) + 'px';
      h.style.top = (p[1] - 5) + 'px';
    });

    const rot = document.querySelector('.rotate-handle');
    if (rot) {
      rot.style.left = (cx - 10) + 'px';
      rot.style.top = (rect.top - 30) + 'px';
    }
  },

  hideHandles() {
    document.querySelectorAll('.resize-handle, .rotate-handle').forEach(h => h.remove());
    document.querySelectorAll('#elements .el-selected').forEach(e => e.classList.remove('el-selected'));
    this.target = null;
  },

  startResize(el, e, handle) {
    this.active = true;
    this.moved = false;
    this.handle = handle;
    this.target = el;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startRect = el.getBoundingClientRect();
  },

  startRotate(el, e) {
    this.active = true;
    this.moved = false;
    this.handle = 'rotate';
    this.target = el;
    this.startX = e.clientX;
    this.startY = e.clientY;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    this.startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    this.startRotation = Number(el.dataset.rotation || 0);
  },

  onMove(e) {
    if (!this.active || !this.target) return;

    const el = this.target;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) this.moved = true;

    if (this.handle === 'rotate') {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const current = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
      let angle = Math.round(this.startRotation + (current - this.startAngle));
      if (e.shiftKey) angle = Math.round(angle / 15) * 15;
      el.dataset.rotation = angle;
      el.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    } else {
      const parentRect = el.parentElement.getBoundingClientRect();
      const minSize = 20;
      const ratio = this.startRect.height ? this.startRect.width / this.startRect.height : 1;
      let newWidth = this.startRect.width;
      let newHeight = this.startRect.height;
      let newX = this.startRect.left;
      let newY = this.startRect.top;

      switch(this.handle) {
        case 'se':
          newWidth = Math.max(minSize, this.startRect.width + dx);
          newHeight = Math.max(minSize, this.startRect.height + dy);
          break;
        case 'sw':
          newWidth = Math.max(minSize, this.startRect.width - dx);
          newHeight = Math.max(minSize, this.startRect.height + dy);
          newX = this.startRect.left + (this.startRect.width - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(minSize, this.startRect.width + dx);
          newHeight = Math.max(minSize, this.startRect.height - dy);
          newY = this.startRect.top + (this.startRect.height - newHeight);
          break;
        case 'nw':
          newWidth = Math.max(minSize, this.startRect.width - dx);
          newHeight = Math.max(minSize, this.startRect.height - dy);
          newX = this.startRect.left + (this.startRect.width - newWidth);
          newY = this.startRect.top + (this.startRect.height - newHeight);
          break;
        case 'e':
          newWidth = Math.max(minSize, this.startRect.width + dx);
          break;
        case 'w':
          newWidth = Math.max(minSize, this.startRect.width - dx);
          newX = this.startRect.left + (this.startRect.width - newWidth);
          break;
        case 's':
          newHeight = Math.max(minSize, this.startRect.height + dy);
          break;
        case 'n':
          newHeight = Math.max(minSize, this.startRect.height - dy);
          newY = this.startRect.top + (this.startRect.height - newHeight);
          break;
      }

      // Shift nas alças de canto mantém a proporção
      if (e.shiftKey && this.handle.length === 2) {
        newHeight = Math.max(minSize, newWidth / ratio);
        if (this.handle === 'nw' || this.handle === 'ne') newY = this.startRect.bottom - newHeight;
      }

      // Texto e adesivo escalam por font-size, não por width/height
      if (el.dataset.el === 'text' || el.dataset.el === 'sticker') {
        if (!el.dataset.baseFont) {
          el.dataset.baseFont = parseFloat(getComputedStyle(el).fontSize) || 26;
        }
        const scale = this.startRect.height ? newHeight / this.startRect.height : 1;
        const fs = Math.max(8, Math.min(400, Math.round(Number(el.dataset.baseFont) * scale)));
        el.style.fontSize = fs + 'px';
      } else {
        el.style.width = newWidth + 'px';
        if (el.dataset.el !== 'line') el.style.height = newHeight + 'px';
      }

      // Mesmo sistema do arraste: px relativos ao pai, ancorado no centro
      el.style.left = (newX - parentRect.left + newWidth / 2) + 'px';
      el.style.top = (newY - parentRect.top + newHeight / 2) + 'px';
      const rot = el.dataset.rotation ? ` rotate(${el.dataset.rotation}deg)` : '';
      el.style.transform = `translate(-50%, -50%)${rot}`;
    }

    this.reposition();
    this.updatePropertiesPanel();
  },

  onUp() {
    if (!this.active) return;
    const didChange = this.moved;
    if (this.target) delete this.target.dataset.baseFont;
    this.active = false;
    this.handle = null;
    this.moved = false;
    if (didChange) {
      if (window.History?.push) window.History.push('resize');
      if (window.Layers?.render) window.Layers.render();
    }
  },

  updatePropertiesPanel() {
    const el = window.State?.selected || this.target;
    if (!el || !el.isConnected) return;
    const phoneEl = document.getElementById('phone');
    if (!phoneEl) return;

    const rect = el.getBoundingClientRect();
    const phone = phoneEl.getBoundingClientRect();
    const set = (id, value) => {
      const input = document.getElementById(id);
      if (input && document.activeElement !== input) input.value = value;
    };

    set('propX', Math.round(rect.left - phone.left));
    set('propY', Math.round(rect.top - phone.top));
    set('propW', Math.round(rect.width));
    set('propH', Math.round(rect.height));
    set('propRot', Math.round(Number(el.dataset.rotation || 0)));
    set('propOpac', Math.round((el.style.opacity === '' ? 1 : parseFloat(el.style.opacity)) * 100));
  }
};
