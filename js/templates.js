window.Templates = {
  init() {
    document.getElementById('templatesGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.template-card');
      if (!card) return;
      document.querySelectorAll('.template-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const type = card.dataset.template;
      this.render(type);
    });

    // Iniciar com template vazio
    this.render('empty');
  },

  render(type) {
    const grid = document.getElementById('gridCells');
    const elements = document.getElementById('elements');
    grid.innerHTML = '';

    // Remover células de template anteriores (mantendo bg e elementos de texto/sticker)
    grid.querySelectorAll('.template-cell').forEach(cell => cell.remove());

    let cells = [];

    if (type === 'grid3') {
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      grid.style.gridTemplateRows = 'repeat(3, 1fr)';
      cells = Array(9).fill(null);
    } else if (type === 'mosaic') {
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = '1fr 1fr';
      grid.style.gridTemplateRows = '1.3fr 1fr 1fr';
      cells = [
        { span: '1 / -1' }, // topo largo
        { span: '' },
        { span: '' },
        { span: '' }
      ];
    } else {
      grid.style.display = 'none';
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
      `;
      if (cellDef && cellDef.span) {
        cell.style.gridColumn = cellDef.span;
      }

      // Ícone de upload
      cell.innerHTML = `
        <div class="cell-icon" style="color:rgba(255,255,255,0.6); font-size:20px; pointer-events:none;">+</div>
        <input type="file" accept="image/*" multiple style="display:none;" class="cell-input" />
      `;

      // Clique para selecionar foto
      cell.addEventListener('click', (e) => {
        if (e.target.classList.contains('cell-input')) return;
        const input = cell.querySelector('.cell-input');
        input.click();
      });

      // Input change - carregar imagens
      cell.querySelector('.cell-input').addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Remover imagens anteriores desta célula
        cell.querySelectorAll('.cell-img').forEach(img => img.remove());

        files.forEach((file, i) => {
          if (!file.type.startsWith('image/')) return;
          const url = URL.createObjectURL(file);
          const img = document.createElement('img');
          img.className = 'cell-img';
          img.src = url;
          img.style.cssText = `
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            pointer-events: none;
          `;
          cell.appendChild(img);
        });

        // Mostrar ícone atualizado
        const icon = cell.querySelector('.cell-icon');
        if (icon) icon.textContent = files.length > 1 ? `${files.length}` : '+';
      });

      grid.appendChild(cell);
    });
  },
};
