// Project management module for My Story Maker
// Uses IndexedDB to persist projects and provides CRUD, load, rename, delete, and UI helpers.

window.Project = {
  current: null,
  projects: [],

  ADJ_KEYS: [
    'brightness', 'contrast', 'exposure', 'shadows', 'highlights',
    'temperature', 'tint', 'saturation', 'clarity', 'zoom'
  ],

  async init() {
    await this.loadProjects();
    this.setupUI();
  },

  notify(msg, type = 'info') {
    if (window.showToast) window.showToast(msg, 2200, type);
  },

  async openDB() {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB not available');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('myStoryMakerDB', 1);
      request.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async loadProjects() {
    try {
      const db = await this.openDB();
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();
      const list = await new Promise((res, rej) => {
        request.onsuccess = () => res(request.result || []);
        request.onerror = () => res([]);
      });
      this.projects = list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return this.projects;
    } catch (e) {
      console.warn('Failed to load projects:', e);
      this.projects = [];
      return [];
    }
  },

  async saveProject(name, data, id = null) {
    const db = await this.openDB();
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const existing = id ? this.projects.find(p => p.id === id) : null;
    const project = {
      id: id || Date.now().toString(),
      name,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data
    };
    await new Promise((res, rej) => {
      const req = store.put(project);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
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
      await new Promise((res, rej) => {
        const req = store.delete(id);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      });
      await this.loadProjects();
      this.notify('Projeto excluído', 'success');
    } catch (e) {
      console.error('Error deleting project:', e);
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
      await new Promise((res, rej) => {
        const req = store.put(updated);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      });
      await this.loadProjects();
      this.notify('Projeto renomeado', 'success');
    } catch (e) {
      console.error('Error renaming project:', e);
      this.notify('Não foi possível renomear o projeto', 'error');
    }
  },

  async createNewProject() {
    const name = prompt('Nome do projeto:', 'Projeto ' + new Date().toLocaleDateString('pt-BR'));
    if (!name) return;
    const snapshot = this.snapshot();
    const project = await this.saveProject(name.trim(), snapshot);
    this.current = project;
    this.updateProjectLabel();
    this.notify(`Projeto "${project.name}" criado`, 'success');
  },

  async saveCurrentProject() {
    if (!this.current) return this.createNewProject();
    const snapshot = this.snapshot();
    const project = await this.saveProject(this.current.name, snapshot, this.current.id);
    this.current = project;
    this.updateProjectLabel();
    this.notify('My-sotory-makder diz', 'success');
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

  collectElements() {
    const elements = [];
    document.querySelectorAll('#elements > [data-el]').forEach(el => {
      elements.push({
        id: el.id,
        type: el.dataset.el,
        html: el.innerHTML,
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
    const container = document.getElementById('projectListContainer');
    if (!modal || !container) return;
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<p style="opacity:0.5;text-align:center;">Nenhum projeto salvo</p>';
    } else {
      list.forEach(p => {
        const item = document.createElement('div');
        item.className = 'project-item';
        const info = document.createElement('div');
        info.className = 'project-info';
        const nameEl = document.createElement('div');
        nameEl.className = 'project-name';
        nameEl.textContent = p.name;
        const dateEl = document.createElement('div');
        dateEl.className = 'project-date';
        dateEl.textContent = new Date(p.updatedAt).toLocaleString();
        info.appendChild(nameEl);
        info.appendChild(dateEl);
        const actions = document.createElement('div');
        actions.className = 'project-actions';
        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn btn-sm';
        loadBtn.textContent = 'Abrir';
        loadBtn.onclick = () => this.loadProject(p.id);
        const renameBtn = document.createElement('button');
        renameBtn.className = 'btn btn-sm';
        renameBtn.textContent = 'Renomear';
        renameBtn.onclick = () => this.renameProject(p.id);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-sm';
        deleteBtn.textContent = 'Excluir';
        deleteBtn.onclick = () => this.removeProject(p.id);
        actions.appendChild(loadBtn);
        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(info);
        item.appendChild(actions);
        container.appendChild(item);
      });
    }
    modal.style.display = 'flex';
  },

  async loadProject(id) {
    const project = this.projects.find(p => p.id === id);
    if (!project) return this.notify('Projeto não encontrado', 'error');
    this.current = project;
    this.applySnapshot(project.data || {});
    this.updateProjectLabel();
    const modal = document.getElementById('projectListModal');
    if (modal) modal.style.display = 'none';
    this.notify(`Projeto "${project.name}" carregado`, 'success');
  },

  applySnapshot(d) {
    d = d || {};
    const bg = document.getElementById('bg');
    if (bg && d.background && !d.background.startsWith('blob:')) bg.src = d.background;
    if (d.ratio) {
      window.State.ratio = d.ratio;
      const phone = document.getElementById('phone');
      if (phone) phone.style.aspectRatio = d.ratio === '1:1' ? '1/1' : '9/16';
      document.querySelectorAll('.overlay-chip').forEach(c => c.classList.toggle('active', c.dataset.ratio === d.ratio));
      const label = document.getElementById('ratioLabel');
      if (label) label.textContent = d.ratio === '1:1' ? 'Post • 1:1' : 'Story • 9/16';
    }
    window.State._preset = d.preset || 'none';
    window.State.filter = d.filter || d.preset || 'none';
    document.querySelectorAll('.filter-card').forEach(c => c.classList.toggle('active', (c.dataset.filter || 'none') === window.State._preset));
    this.ADJ_KEYS.forEach(k => {
      const val = d[k] ?? 100;
      window.State[k] = val;
      const inp = document.getElementById(k);
      const valEl = document.getElementById(k + 'Val');
      if (inp) inp.value = val;
      if (valEl) valEl.textContent = val;
    });
    if (d.template && window.Templates?.render) {
      window.Templates.render(d.template);
      document.querySelectorAll('.template-card').forEach(c => c.classList.toggle('active', c.dataset.template === d.template));
    }
    window.State.cellFilters = d.cellFilters || {};
    window.State.activeCell = null;
    if (Array.isArray(d.cells)) {
      document.querySelectorAll('#gridCells .template-cell').forEach((cell, i) => {
        const src = d.cells[i];
        const img = cell.querySelector('.cell-img');
        if (src && !src.startsWith('blob:')) {
          if (window.Templates?.addImageToCell) window.Templates.addImageToCell(i, src);
          else if (img) img.src = src;
        } else if (img) {
          img.remove();
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
        if (window.Elements?.hydrate) window.Elements.hydrate(el);
      });
    }
    if (window.Resize?.hideHandles) window.Resize.hideHandles();
    if (window.Filters?.apply) window.Filters.apply();
    if (window.Filters?.applyAllCellFilters) window.Filters.applyAllCellFilters();
    if (bg) bg.style.transform = `scale(${(window.State.zoom || 100) / 100})`;
    if (window.Layers?.render) window.Layers.render();
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (typeof updateCellFilterHint === 'function') updateCellFilterHint();
    if (window.History?.push) window.History.push('load-project');
  },

  updateProjectLabel() {
    const el = document.getElementById('projectName');
    if (el) el.textContent = this.current ? this.current.name : 'Novo projeto';
  },

  setupUI() {
    document.getElementById('btnNewProject')?.addEventListener('click', () => this.createNewProject());
    document.getElementById('btnSaveProject')?.addEventListener('click', () => this.saveCurrentProject());
    document.getElementById('btnLoadProject')?.addEventListener('click', () => this.showProjectList());
    const modal = document.getElementById('projectListModal');
    const close = () => { if (modal) modal.style.display = 'none'; };
    document.getElementById('modalCloseX')?.addEventListener('click', close);
    document.getElementById('modalCloseProject')?.addEventListener('click', close);
    document.getElementById('modalNewProject')?.addEventListener('click', () => { close(); this.createNewProject(); });
    modal?.addEventListener('click', e => { if (e.target === modal) close(); });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.Project.init());
} else {
  window.Project.init();
}
