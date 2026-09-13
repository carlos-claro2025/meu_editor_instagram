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

  // Salva o projeto como JSON reimportável (mesmo formato do Project.snapshot)
  async save() {
    try {
      const data = window.Project.snapshot();
      data.version = 2;
      data.savedAt = new Date().toISOString();
      data.background = await this.toDataURL(data.background);
      data.cells = await Promise.all((data.cells || []).map(src => this.toDataURL(src)));

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

  init() {
    // Nada a inicializar: os botões são ligados em app.js
  },

  async saveToDisk(format, quality) {
    format = format || 'png';
    quality = quality || 0.92;
    let canvas;
    try {
      canvas = await this.render(2);
    } catch (err) {
      console.error(err);
      return this.notify('Exportação indisponível neste ambiente', 'error');
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
      this.notify('Falha ao salvar imagem. Tente PNG.', 'error');
    }
  },
};
