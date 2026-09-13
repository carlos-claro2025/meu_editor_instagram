// Estado global compartilhado
window.State = {
  filter: 'none',
  _preset: 'none',           // preset de filtro selecionado
  brightness: 100,
  saturation: 100,
  zoom: 100,
  // Ajustes estilo Photoshop
  contrast: 100,
  exposure: 100,
  shadows: 100,
  highlights: 100,
  temperature: 100,
  tint: 100,
  clarity: 100,
  ratio: '9:16',
  selected: null,
  activeCell: null,         // célula atualmente selecionada para filtro individual
  cellFilters: {},          // { "0": {filter,brightness,...}, ... }
  feedImages: new Map(),

  addFeedImage(url, name) {
    this.feedImages.set(url, name);
    this.renderFeedImages();
  },

  removeFeedImage(url) {
    this.feedImages.delete(url);
    if (url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url); } catch (e) { /* já revogada */ }
    }
    this.renderFeedImages();
  },

  renderFeedImages() {
    const grid = document.getElementById('feedGrid');
    if (!grid) return;
    grid.innerHTML = '';
    this.feedImages.forEach((name, url) => {
      const item = document.createElement('div');
      item.className = 'feed-item';
      item.title = name + ' — clique para inserir';
      item.setAttribute('role', 'button');
      item.tabIndex = 0;

      // createElement em vez de innerHTML: nome do arquivo não vira HTML
      const img = document.createElement('img');
      img.src = url;
      img.alt = name;
      img.loading = 'lazy';
      item.appendChild(img);

      const del = document.createElement('button');
      del.className = 'feed-remove';
      del.type = 'button';
      del.textContent = '✕';
      del.title = 'Remover da biblioteca';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFeedImage(url);
        if (window.showToast) window.showToast('Foto removida da biblioteca', 1600, 'info');
      });
      item.appendChild(del);

      const insert = () => window.DragDrop?.addImage(url);
      item.addEventListener('click', insert);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); insert(); }
      });
      grid.appendChild(item);
    });
  },

  // Constrói string CSS filter a partir de valores ajustados
  getFilterString(filters) {
    const f = filters || window.State;
    const parts = [];
    // Filtro base (preset)
    let base = 'none';
    switch(f._preset) {
      case 'grayscale': base = 'grayscale(100%)'; break;
      case 'sepia':     base = 'sepia(80%) saturate(150%)'; break;
      case 'warm':      base = 'saturate(150%) hue-rotate(-10deg)'; break;
      case 'vivid':     base = 'saturate(200%) contrast(110%)'; break;
      case 'cool':      base = 'hue-rotate(20deg) saturate(80%)'; break;
      case 'dramatic':  base = 'contrast(140%) brightness(90%)'; break;
      case 'fade':      base = 'brightness(110%) contrast(90%) saturate(80%)'; break;
      default:          base = 'none';
    }
    if (base !== 'none') parts.push(base);
    // Ajustes manuais estilo Photoshop
    const bright   = f.brightness   ?? 100;
    const contrast = f.contrast     ?? 100;
    const expo     = f.exposure     ?? 100;
    const shadows  = f.shadows      ?? 100;
    const highs    = f.highlights   ?? 100;
    const temp     = f.temperature  ?? 100;
    const tint     = f.tint         ?? 100;
    const saturate = f.saturation   ?? 100;
    const clarity  = f.clarity      ?? 100;

    // Luminosidade combinada — evita empilhar vários brightness() (estourava a imagem)
    let lum = (bright / 100) * (expo / 100);
    lum *= 1 + (shadows - 100) * 0.002;
    lum *= 1 + (highs - 100) * 0.0015;
    const lumPct = Math.round(Math.min(400, Math.max(0, lum * 100)));
    if (lumPct !== 100) parts.push(`brightness(${lumPct}%)`);

    // Contraste combinado (ajuste + clareza)
    let con = contrast / 100;
    con *= 1 + (clarity - 100) * 0.004;
    const conPct = Math.round(Math.min(400, Math.max(0, con * 100)));
    if (conPct !== 100) parts.push(`contrast(${conPct}%)`);

    // Temperatura (quente = amarelo; frio = azul)
    if (temp !== 100) {
      const t = (temp - 100) / 100;
      if (t > 0) parts.push(`sepia(${Math.round(t * 45)}%)`);
      else parts.push(`sepia(${Math.round(-t * 20)}%) hue-rotate(${Math.round(-t * 60)}deg)`);
    }
    // Tint (verde/magenta)
    if (tint !== 100) parts.push(`hue-rotate(${((tint - 100) * 0.3).toFixed(1)}deg)`);
    if (saturate !== 100) parts.push(`saturate(${saturate}%)`);

    return parts.join(' ') || 'none';
  },
};
