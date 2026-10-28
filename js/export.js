window.Export = {
  clear() {
    const items = document.querySelectorAll('#elements > *');
    items.forEach((el) => el.remove());
  },

  notify(msg, type) {
    if (window.showToast) window.showToast(msg, 2200, type || 'info');
    else console.log(msg);
  },

  // Renderiza o canvas inteiro (fundo + grid + textos + adesivos)
  async render(scale) {
    const el = document.getElementById('phone');
    if (!el) throw new Error('Canvas não encontrado');
    if (typeof html2canvas === 'undefined') throw new Error('html2canvas indisponível');
    const images = Array.from(el.querySelectorAll('img'));
    images.forEach((img) => {
      if (!img.complete && /^https?:\/\//i.test(img.src)) {
        img.crossOrigin = 'anonymous';
      }
    });
    await Promise.all(images.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return;
      if (typeof img.decode === 'function') {
        try { await img.decode(); } catch (_) { /* html2canvas reportará a falha */ }
      }
    }));
    // Alças, botões de UI e bordas de célula não devem aparecer na imagem final
    const hidden = [];
    document.querySelectorAll('.resize-handle, .rotate-handle, .overlay-controls, .cell-swap, .cell-icon')
      .forEach(h => {
        hidden.push([h, h.style.visibility]);
        h.style.visibility = 'hidden';
      });
    const unstyled = [];
    document.querySelectorAll('#gridCells .template-cell').forEach(cell => {
      unstyled.push([cell, cell.style.border, cell.style.borderColor, cell.style.background, cell.style.boxShadow]);
      cell.style.border = 'none';
      cell.style.background = 'transparent';
      cell.style.boxShadow = 'none';
    });
    // O contorno de seleção não pode vazar para a imagem final
    const deselected = [];
    document.querySelectorAll('.el-selected').forEach(el => {
      deselected.push(el);
      el.classList.remove('el-selected');
    });
    try {
      return await html2canvas(el, {
        useCORS: true,
        allowTaint: false,
        scale: scale || 2,
        backgroundColor: null,
        imageTimeout: 15000,
        logging: false
      });
    } finally {
      hidden.forEach(([h, v]) => { h.style.visibility = v; });
      unstyled.forEach(([c, b, bc, bg, sh]) => {
        c.style.border = b;
        c.style.borderColor = bc;
        c.style.background = bg;
        c.style.boxShadow = sh;
      });
      deselected.forEach(el => el.classList.add('el-selected'));
    }
  },

  // Converte uma URL de imagem (inclusive blob:) em data URL para que o
  // arquivo .json continue funcionando depois de recarregar a página
  async toDataURL(src) {
    if (!src) return null;
    if (src.indexOf('data:') === 0) return src;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Não foi possível embutir a imagem', src, err);
      return null;
    }
  },

  async embedSource(src) {
    if (!src) return src;
    const embedded = await this.toDataURL(src);
    if (!embedded) {
      throw new Error('Não foi possível embutir a imagem do projeto');
    }
    return embedded;
  },

  async embedElementImages(elements) {
    return Promise.all((elements || []).map(async (element) => {
      const wrapper = document.createElement('div');
      if (element.html) {
        wrapper.innerHTML = element.html;
        const images = Array.from(wrapper.querySelectorAll('img'));
        for (const img of images) {
          const src = img.getAttribute('src');
          if (src) img.setAttribute('src', await this.embedSource(src));
        }
      }
      return {
        ...element,
        html: element.html ? wrapper.innerHTML : element.html,
        children: await this.embedElementImages(element.children || [])
      };
    }));
  },

  // Salva o projeto como JSON reimportável (mesmo formato do Project.snapshot)
  async save() {
    try {
      const data = window.Project.snapshot();
      // Faixas locais são armazenadas no projeto IndexedDB, mas não podem ser
      // serializadas como JSON de forma confiável.
      data.music = null;
      data.version = 2;
      data.savedAt = new Date().toISOString();
      data.background = await this.embedSource(data.background);
      data.cells = await Promise.all((data.cells || []).map(src => this.embedSource(src)));
      data.elements = await this.embedElementImages(data.elements);

      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'story-projeto-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.notify('Projeto salvo como arquivo .json', 'success');
    } catch (err) {
      console.error(err);
      this.notify('Falha ao salvar o projeto', 'error');
    }
  },

  // Importa o .json gerado por save()
  load(data) {
    if (!data || typeof data !== 'object') {
      return this.notify('Arquivo de projeto inválido', 'error');
    }
    window.Project.applySnapshot(data);
    this.notify('Projeto importado', 'success');
  },

  // Pré-visualização real: renderiza tudo, não só o fundo
  async preview() {
    let canvas;
    try {
      canvas = await this.render(2);
    } catch (err) {
      console.error(err);
      return this.notify('Pré-visualização indisponível', 'error');
    }

    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank', 'width=460,height=820');
    if (!win) return this.notify('Permita pop-ups para pré-visualizar', 'error');

    win.document.open();
    win.document.write('<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8">' +
      '<title>Pré-visualização</title><style>' +
      'body{margin:0;display:flex;flex-direction:column;justify-content:center;align-items:center;' +
      'min-height:100vh;background:#0b0b0b;font-family:system-ui,sans-serif;color:#888;gap:12px}' +
      'img{max-width:96%;max-height:88vh;object-fit:contain;border-radius:16px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.6)}' +
      'a{color:#e9c46a;font-size:13px;text-decoration:none;border:1px solid #333;' +
      'padding:6px 14px;border-radius:8px}</style></head><body>' +
      '<img src="' + dataUrl + '" alt="Pré-visualização do story">' +
      '<a href="' + dataUrl + '" download="story-preview.png">Baixar esta imagem</a>' +
      '</body></html>');
    win.document.close();
  },

  async exportImage(format) {
    return this.saveToDisk(format);
  },

  async exportWithOptions(quality) {
    return this.saveToDisk('png', quality);
  },

  setBusy(busy) {
    ['exportBtn', 'exportDropdownBtn', 'previewBtn'].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.disabled = busy;
    });
  },

  init() {
    // Nada a inicializar: os botões são ligados em app.js
  },

  async saveToDisk(format, quality) {
    format = format || 'png';
    quality = quality || 0.92;
    this.setBusy(true);
    this.notify('Preparando exportação…', 'info');
    let canvas;
    try {
      canvas = await this.render(2);
    } catch (err) {
      console.error(err);
      this.setBusy(false);
      return this.notify(
        'Não foi possível exportar. Verifique imagens externas ou tente PNG novamente.',
        'error'
      );
    }

    try {
      const now = new Date();
      const ts = now.getFullYear() +
        '-' + String(now.getMonth() + 1).padStart(2, '0') +
        '-' + String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        '-' + String(now.getMinutes()).padStart(2, '0');

      const mime = format === 'jpg' ? 'image/jpeg' : (format === 'webp' ? 'image/webp' : 'image/png');
      const href = format === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL(mime, quality);

      const link = document.createElement('a');
      link.download = 'story-' + ts + '.' + format;
      link.href = href;
      link.click();
      this.notify('Imagem exportada em ' + format.toUpperCase(), 'success');
    } catch (err) {
      console.error(err);
      this.notify('Falha ao salvar imagem. Tente PNG ou remova imagens externas.', 'error');
    } finally {
      this.setBusy(false);
    }
  },
};
