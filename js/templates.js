window.Templates = {
  current: 'empty',

  init() {
    const grid = document.getElementById('templatesGrid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.template-card');
        if (!card) return;
        if (card.dataset.template === this.current) return;
        const hadPhotos = document.querySelectorAll('#gridCells .cell-img').length > 0;
        if (hadPhotos && !confirm('Trocar o modelo vai remover as fotos já colocadas nas células. Continuar?')) return;
        document.querySelectorAll('.template-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.render(card.dataset.template);
        if (window.History?.push) window.History.push('template-change');
      });
    }

    // Iniciar com template vazio
    this.render('empty');
  },

  render(type) {
    const grid = document.getElementById('gridCells');
    if (!grid) return;
    this.current = type || 'empty';

    // Libera as blob URLs das fotos que serão descartadas
    grid.querySelectorAll('.cell-img').forEach(img => {
      if (img.src.startsWith('blob:')) { try { URL.revokeObjectURL(img.src); } catch (e) {} }
    });
    grid.innerHTML = '';
    window.State.activeCell = null;
    window.State.cellFilters = {};
    if (typeof updateCellFilterHint === 'function') updateCellFilterHint();

    let cells = [];

    if (type === 'grid3') {
      grid.style.display = 'grid';
      grid.classList.add('show');
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      grid.style.gridTemplateRows = 'repeat(3, 1fr)';
      cells = Array(9).fill(null);
    } else if (type === 'mosaic') {
      grid.style.display = 'grid';
      grid.classList.add('show');
      grid.style.gridTemplateColumns = '1fr 1fr';
      grid.style.gridTemplateRows = '1.3fr 1fr 1fr';
      cells = [
        { span: '1 / 2' },
        { span: '' },
        { span: '' },
        { span: '' }
      ];
    } else {
      grid.style.display = 'none';
      grid.classList.remove('show');
      return;
    }

    cells.forEach((cellDef, index) => {
      const cell = document.createElement('div');
      cell.className = 'template-cell';
      cell.dataset.cellIndex = index;
      cell.style.cssText = `
        border: 2px dashed rgba(255,255,255,0.4);
        border-radius: 4px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.3);
        transition: border-color 0.2s;
        min-height: 100px;
      `;
      if (cellDef && cellDef.span) {
        cell.style.gridColumn = cellDef.span;
      }

      // Criar ícone de upload
      const icon = document.createElement('div');
      icon.className = 'cell-icon';
      icon.style.cssText = 'color:rgba(255,255,255,0.6); font-size:24px; pointer-events:none; user-select:none;';
      icon.textContent = '+';
      cell.appendChild(icon);

      // Input de arquivo escondido
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.style.display = 'none';
      input.className = 'cell-input';
      cell.appendChild(input);

      // Quando selecionar arquivo
      input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        e.target.value = '';
        if (files.length === 0) return;

        // Antes, vários arquivos empilhavam imagens na MESMA célula (só a última
        // aparecia). Agora a primeira vai nesta célula e as demais preenchem as
        // células vazias seguintes.
        const cells = Array.from(grid.querySelectorAll('.template-cell'));
        let placed = 0;
        files.forEach((file, i) => {
          if (file.size > 10 * 1024 * 1024) {
            if (window.showToast) window.showToast('"' + file.name + '" passa de 10 MB', 3000, 'error');
            return;
          }
          const url = URL.createObjectURL(file);
          window.State.addFeedImage(url, file.name);
          let targetIndex = index;
          if (i > 0) {
            targetIndex = cells.findIndex((c, ci) => ci !== index && !c.querySelector('.cell-img'));
            if (targetIndex < 0) return; // sem célula vazia: fica só na biblioteca
          }
          this.addImageToCell(targetIndex, url);
          placed++;
        });

        if (!placed) return;
        if (window.showToast) {
          window.showToast(placed > 1
            ? placed + ' fotos inseridas nas células'
            : 'Foto na célula ' + (index + 1), 1600, 'success');
        }
        if (window.History?.push) window.History.push('add-photo');
      });

      // Hover effect
      cell.addEventListener('mouseenter', () => {
        if (!cell.classList.contains('selected')) {
          cell.style.borderColor = 'rgba(255,255,255,0.8)';
        }
      });
      cell.addEventListener('mouseleave', () => {
        if (!cell.classList.contains('selected')) {
          cell.style.borderColor = 'rgba(255,255,255,0.4)';
        }
      });

      // Clique: com foto seleciona para filtro individual; vazia abre o seletor
      const activate = () => {
        if (cell.querySelector('.cell-img')) {
          Filters.selectCell(index);
          if (typeof updateCellFilterHint === 'function') updateCellFilterHint();
        } else {
          input.click();
        }
      };

      cell.addEventListener('click', (e) => {
        if (e.target === input || e.target.closest('.cell-input')) return;
        if (e.target.closest('.cell-swap')) return;
        activate();
      });

      // Duplo clique troca a foto da célula
      cell.addEventListener('dblclick', (e) => {
        if (e.target.closest('.cell-input')) return;
        input.click();
      });

      cell.setAttribute('role', 'button');
      cell.tabIndex = 0;
      cell.title = 'Célula ' + (index + 1) + ' — clique para selecionar, duplo clique para trocar a foto';
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });

      // Botão de troca rápida, visível quando a célula tem foto
      const swap = document.createElement('button');
      swap.type = 'button';
      swap.className = 'cell-swap';
      swap.textContent = '⇄';
      swap.title = 'Trocar a foto desta célula';
      swap.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
      cell.appendChild(swap);

      grid.appendChild(cell);
    });
  },

  // Método para adicionar foto a uma célula específica pelo index
  addImageToCell(cellIndex, imageUrl) {
    const grid = document.getElementById('gridCells');
    if (!grid) return;
    const cells = grid.querySelectorAll('.template-cell');
    if (!cells[cellIndex]) return;

    const cell = cells[cellIndex];
    const icon = cell.querySelector('.cell-icon');

    // Remover imagens anteriores
    cell.querySelectorAll('.cell-img').forEach(img => {
      if (img.src.startsWith('blob:') && img.src !== imageUrl) {
        try { URL.revokeObjectURL(img.src); } catch (e) {}
      }
      img.remove();
    });

    // Adicionar nova imagem
    const img = document.createElement('img');
    img.className = 'cell-img';
    img.src = imageUrl;
    img.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    `;
    if (icon) cell.insertBefore(img, icon); else cell.prepend(img);

    // Filtro individual da célula, ou o global (mesma regra do Filters.apply)
    const cellFilter = window.State.cellFilters[cellIndex];
    img.style.filter = window.Filters
      ? window.Filters.getFilterString(cellFilter || window.State)
      : 'none';

    if (icon) icon.textContent = '';
    cell.dataset.hasImage = 'true';
  },

  // Primeira célula vazia, usada ao inserir foto da biblioteca
  firstEmptyCell() {
    const grid = document.getElementById('gridCells');
    if (!grid || grid.style.display === 'none') return -1;
    const cells = Array.from(grid.querySelectorAll('.template-cell'));
    return cells.findIndex(c => !c.querySelector('.cell-img'));
  }
};
