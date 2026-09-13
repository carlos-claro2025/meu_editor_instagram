window.DragDrop = {
  init() {
    const phone = document.getElementById('phone');
    if (!phone) return;

    // Rede de segurança: elemento sem arraste próprio recebe o arraste padrão
    phone.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.template-cell') || e.target.closest('.cell-input')) return;
      const el = e.target.closest('[data-el]');
      if (!el || el.dataset.locked === 'true') return;
      if (el.dataset.draggableBound === 'true') return;
      if (window.Elements?.hydrate) window.Elements.hydrate(el);
    });

    this.initFileDrop(phone);
  },

  // Arrastar imagens do computador direto para o canvas ou para uma célula
  initFileDrop(phone) {
    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

    const highlight = (cell) => {
      phone.querySelectorAll('.template-cell.drop-hover').forEach(c => c.classList.remove('drop-hover'));
      if (cell) cell.classList.add('drop-hover');
    };

    phone.addEventListener('dragover', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      phone.classList.add('drop-active');
      highlight(e.target.closest('.template-cell'));
    });

    phone.addEventListener('dragleave', (e) => {
      if (e.target === phone || !phone.contains(e.relatedTarget)) {
        phone.classList.remove('drop-active');
        highlight(null);
      }
    });

    phone.addEventListener('drop', (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      phone.classList.remove('drop-active');
      const cell = e.target.closest('.template-cell');
      highlight(null);

      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) {
        if (window.showToast) window.showToast('Solte apenas arquivos de imagem', 2500, 'error');
        return;
      }

      const cellIndex = cell ? Number(cell.dataset.cellIndex) : null;
      let inserted = 0;
      files.forEach((file, i) => {
        if (file.size > 10 * 1024 * 1024) {
          if (window.showToast) window.showToast('"' + file.name + '" passa de 10 MB', 3000, 'error');
          return;
        }
        const url = URL.createObjectURL(file);
        window.State.addFeedImage(url, file.name);
        if (cellIndex !== null) {
          if (i === 0) {
            window.Templates?.addImageToCell(cellIndex, url);
            inserted++;
          }
        } else {
          this.addImage(url, { silent: true });
          inserted++;
        }
      });

      if (inserted && window.showToast) {
        const msg = cellIndex !== null
          ? 'Foto na célula ' + (cellIndex + 1)
          : (inserted > 1 ? inserted + ' fotos inseridas' : 'Foto inserida');
        window.showToast(msg, 1800, 'success');
      }
    });
  },

  addImage(url, opts) {
    const options = opts || {};

    // Célula selecionada (ou primeira vaga) recebe a foto em vez de criar camada solta
    if (!options.forceFloat) {
      const active = window.State.activeCell;
      const target = (active !== null && active !== undefined)
        ? Number(active)
        : (window.Templates?.firstEmptyCell ? window.Templates.firstEmptyCell() : -1);
      if (target >= 0 && window.Templates?.addImageToCell) {
        window.Templates.addImageToCell(target, url);
        if (!options.silent && window.showToast) {
          window.showToast('Foto na célula ' + (target + 1), 1600, 'success');
        }
        if (window.History?.push) window.History.push('add-photo');
        return null;
      }
    }

    const container = document.getElementById('elements');
    if (!container) return null;

    const wrap = document.createElement('div');
    wrap.dataset.el = 'image';
    wrap.id = 'el-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    wrap.style.cssText = `
      position:absolute;
      left:50%;
      top:50%;
      transform:translate(-50%,-50%);
      width:60%;
      user-select:none;
      cursor:move;
      overflow:hidden;
      border-radius:8px;
    `;

    const img = document.createElement('img');
    img.src = url;
    img.draggable = false;
    img.alt = 'Foto inserida';
    img.style.cssText = 'width:100%; height:100%; display:block; object-fit:cover; pointer-events:none;';
    img.style.filter = window.State.getFilterString(window.State);
    wrap.appendChild(img);

    container.appendChild(wrap);
    if (window.Elements?.hydrate) window.Elements.hydrate(wrap);

    window.State.selected = wrap;
    if (window.Resize?.showHandles) window.Resize.showHandles(wrap);
    if (window.Layers?.render) window.Layers.render();
    if (window.History?.push) window.History.push('add-element');
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (!options.silent && window.showToast) window.showToast('Foto inserida no canvas', 1500, 'success');
    return wrap;
  }
};
