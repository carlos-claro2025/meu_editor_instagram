// Sistema de Projeto (IndexedDB)
window.Project = {
  current: null,
  projects: [],

  ADJ_KEYS: ['brightness', 'contrast', 'exposure', 'shadows', 'highlights',
    'temperature', 'tint', 'saturation', 'clarity', 'zoom'],

  async init() {
    await this.loadProjects();
    this.setupUI();
  },

  notify(msg, type) {
    if (window.showToast) window.showToast(msg, 2200, type || 'info');
  },

  async loadProjects() {
    try {
      const db = await this.openDB();
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();

      const list = await new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
      // Mantém a lista atualizada no estado em vez de descartar
      this.projects = list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return this.projects;
    } catch (e) {
      console.warn('Projetos indisponíveis (IndexedDB):', e && e.message);
      this.projects = [];
      return [];
    }
  },

  async saveProject(name, data, id) {
    const db = await this.openDB();
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const existing = id ? this.projects.find(p => p.id === id) : null;

    const project = {
      // Mantém o id ao atualizar em vez de criar duplicata a cada salvamento
      id: id || Date.now().toString(),
      name: name,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: data
    };

    await new Promise((resolve, reject) => {
      const request = store.put(project);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await this.loadProjects();
    return project;
  },

  async removeProject(id) {
    if (!confirm('Excluir projeto?')) return;
    try {
      const db = await this.openDB();
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      await new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      await this.loadProjects();
      this.notify('Projeto excluído', 'success');
    } catch (e) {
      console.error('Erro ao excluir projeto:', e);
      this.notify('Não foi possível excluir o projeto', 'error');
    }
  },

  async renameProject(id) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return;
    const newName = prompt('Novo nome do projeto:', project.name);
    if (!newName) return;
    try {
      const db = await this.openDB();
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const updated = { ...project, name: newName.trim(), updatedAt: new Date().toISOString() };
      await new Promise((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      await this.loadProjects();
      this.notify('Projeto renomeado', 'success');
    } catch (e) {
      console.error('Erro ao renomear projeto:', e);
      this.notify('Não foi possível renomear o projeto', 'error');
    }
  },

  async openDB() {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB indisponível');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('myStoryMakerDB', 1);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  setupUI() {
    document.getElementById('btnNewProject')?.addEventListener('click', () => this.createNewProject());
    document.getElementById('btnSaveProject')?.addEventListener('click', () => this.saveCurrentProject());
    document.getElementById('btnLoadProject')?.addEventListener('click', () => this.showProjectList());

    const modal = document.getElementById('projectListModal');
    const close = () => { if (modal) modal.style.display = 'none'; };
    document.getElementById('modalCloseX')?.addEventListener('click', close);
    document.getElementById('modalCloseProject')?.addEventListener('click', close);
    document.getElementById('modalNewProject')?.addEventListener('click', () => {
      close();
      this.createNewProject();
    });
    modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });
  },

  snapshot() {
    const data = {
      elements: this.collectElements(),
      background: document.getElementById('bg')?.getAttribute('src') || '',
      template: window.Templates?.current || 'empty',
      cells: Array.from(document.querySelectorAll('#gridCells .template-cell')).map(c => {
        const img = c.querySelector('.cell-img');
        return img ? img.getAttribute('src') : null;
      }),
      ratio: window.State.ratio,
      preset: window.State._preset || 'none',
      filter: window.State.filter || 'none',
      cellFilters: JSON.parse(JSON.stringify(window.State.cellFilters || {}))
    };
    this.ADJ_KEYS.forEach(k => { data[k] = window.State[k] ?? 100; });
    return data;
  },

  async createNewProject() {
    const name = prompt('Nome do projeto:', 'Projeto ' + new Date().toLocaleDateString('pt-BR'));
    if (!name) return;
    try {
      const project = await this.saveProject(name.trim(), this.snapshot());
      this.current = project;
      this.updateProjectLabel();
      this.notify('Projeto "' + project.name + '" criado', 'success');
    } catch (e) {
      console.error(e);
      this.notify('Não foi possível criar o projeto', 'error');
    }
  },

  async saveCurrentProject() {
    if (!this.current) return this.createNewProject();
    try {
      const project = await this.saveProject(this.current.name, this.snapshot(), this.current.id);
      this.current = project;
      this.updateProjectLabel();
      this.notify('Projeto salvo', 'success');
    } catch (e) {
      console.error(e);
      this.notify('Não foi possível salvar o projeto', 'error');
    }
  },

  updateProjectLabel() {
    const pn = document.getElementById('projectName');
    if (pn) pn.textContent = this.current ? this.current.name : 'Novo projeto';
  },

  collectElements() {
    const elements = [];
    document.querySelectorAll('#elements > [data-el]').forEach(el => {
      elements.push({
        id: el.id,
        type: el.dataset.el,
        html: el.childElementCount ? el.innerHTML : '',
        content: el.childElementCount ? '' : el.textContent,
        style: el.style.cssText,
        rotation: el.dataset.rotation || '',
        locked: el.dataset.locked === 'true'
      });
    });
    return elements;
  },

  async showProjectList() {
    const list = await this.loadProjects();
    const modal = document.getElementById('projectListModal');
    const listContainer = document.getElementById('projectListContainer');
    if (!modal || !listContainer) return;

    listContainer.innerHTML = '';

    if (list.length === 0) {
      listContainer.innerHTML = '<p style="opacity:0.5;text-align:center;">Nenhum projeto salvo</p>';
    } else {
      list.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.dataset.id = project.id;

        const info = document.createElement('div');
        info.className = 'project-info';
        const nameEl = document.createElement('div');
        nameEl.className = 'project-name';
        // textContent evita quebra/XSS com nomes contendo aspas ou HTML
        nameEl.textContent = project.name;
        const dateEl = document.createElement('div');
        dateEl.className = 'project-date';
        dateEl.textContent = new Date(project.updatedAt).toLocaleString('pt-BR');
        info.appendChild(nameEl);
        info.appendChild(dateEl);

        const actions = document.createElement('div');
        actions.className = 'project-actions';
        const openBtn = document.createElement('button');
        openBtn.className = 'btn btn-sm';
        openBtn.textContent = 'Abrir';
        openBtn.addEventListener('click', () => this.loadProject(project.id));
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.textContent = 'Excluir';
        delBtn.addEventListener('click', () => this.deleteProject(project.id));
        actions.appendChild(openBtn);
        actions.appendChild(delBtn);

        item.appendChild(info);
        item.appendChild(actions);
        listContainer.appendChild(item);
      });
    }

    modal.style.display = 'flex';
  },

  async loadProject(id) {
    const projects = await this.loadProjects();
    const project = projects.find(p => p.id === id);
    if (!project) return this.notify('Projeto não encontrado', 'error');

    this.current = project;
    this.applySnapshot(project.data || {});
    this.updateProjectLabel();

    const modal = document.getElementById('projectListModal');
    if (modal) modal.style.display = 'none';
    this.notify('Projeto "' + project.name + '" carregado', 'success');
  },

  // Restaura um snapshot (usado pelo IndexedDB e pela importação de .json)
  applySnapshot(d) {
    d = d || {};

    const bg = document.getElementById('bg');
    if (bg && d.background && d.background.indexOf('blob:') !== 0) bg.src = d.background;

    if (d.ratio) {
      window.State.ratio = d.ratio;
      const phone = document.getElementById('phone');
      if (phone) phone.style.aspectRatio = d.ratio === '1:1' ? '1/1' : '9/16';
      document.querySelectorAll('.overlay-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.ratio === d.ratio);
      });
      const label = document.getElementById('ratioLabel');
      if (label) label.textContent = d.ratio === '1:1' ? 'Post • 1:1' : 'Story • 9:16';
    }

    window.State._preset = d.preset || 'none';
    window.State.filter = d.filter || d.preset || 'none';
    document.querySelectorAll('.filter-card').forEach(c => {
      c.classList.toggle('active', (c.dataset.filter || 'none') === window.State._preset);
    });

    this.ADJ_KEYS.forEach(k => {
      const v = d[k] ?? 100;
      window.State[k] = v;
      const inp = document.getElementById(k);
      const val = document.getElementById(k + 'Val');
      if (inp) inp.value = v;
      if (val) val.textContent = v;
    });

    // Recria o grid do template antes de devolver as fotos às células
    if (d.template && window.Templates?.render) {
      window.Templates.render(d.template);
      document.querySelectorAll('.template-card').forEach(c => {
        c.classList.toggle('active', c.dataset.template === d.template);
      });
    }

    window.State.cellFilters = d.cellFilters || {};
    window.State.activeCell = null;

    // Fotos das células (URLs blob: não sobrevivem ao recarregamento)
    if (Array.isArray(d.cells)) {
      document.querySelectorAll('#gridCells .template-cell').forEach((cell, i) => {
        const src = d.cells[i];
        const existing = cell.querySelector('.cell-img');
        if (src && src.indexOf('blob:') !== 0) {
          if (window.Templates?.addImageToCell) window.Templates.addImageToCell(i, src);
          else if (existing) existing.src = src;
        } else if (existing) {
          existing.remove();
          delete cell.dataset.hasImage;
        }
      });
    }

    const elementsContainer = document.getElementById('elements');
    if (elementsContainer) {
      elementsContainer.innerHTML = '';
      (d.elements || []).forEach(elData => {
        const el = document.createElement('div');
        el.id = elData.id || 'el-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        el.dataset.el = elData.type;
        if (elData.html) el.innerHTML = elData.html;
        else el.textContent = elData.content || '';
        el.style.cssText = elData.style || '';
        if (elData.rotation) el.dataset.rotation = elData.rotation;
        if (elData.locked) el.dataset.locked = 'true';
        elementsContainer.appendChild(el);
        // Sem hydrate, os elementos carregados não arrastam
        if (window.Elements?.hydrate) window.Elements.hydrate(el);
      });
    }

    window.State.selected = null;
    const propPanel = document.getElementById('panel-properties');
    if (propPanel) propPanel.style.display = 'none';
    const stylePanel = document.getElementById('panel-style');
    if (stylePanel) stylePanel.style.display = 'none';
    if (window.Resize?.hideHandles) window.Resize.hideHandles();
    if (window.Filters?.apply) window.Filters.apply();
    if (window.Filters?.applyAllCellFilters) window.Filters.applyAllCellFilters();
    if (bg) bg.style.transform = `scale(${(window.State.zoom || 100) / 100})`;
    if (window.Layers?.render) window.Layers.render();
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (typeof updateCellFilterHint === 'function') updateCellFilterHint();
    if (window.History?.push) window.History.push('load-project');
  },

  async deleteProject(id) {
    if (!confirm('Excluir este projeto?')) return;
    await this.removeProject(id);
    if (this.current && this.current.id === id) {
      this.current = null;
      this.updateProjectLabel();
    }
    this.showProjectList();
  }
};
