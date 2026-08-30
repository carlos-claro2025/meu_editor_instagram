console.log('public/app loaded');

function initRatioToggle() {
  const chips = document.querySelectorAll('.overlay-chip');
  const phone = document.getElementById('phone');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      State.ratio = chip.dataset.ratio;
      if (State.ratio === '1:1') {
        phone.style.maxWidth = '360px';
        phone.style.borderRadius = '14px';
      } else {
        phone.style.maxWidth = '380px';
        phone.style.borderRadius = '22px';
      }
    });
  });
}

function initTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

function initFeed() {
  const feed = document.getElementById('feedGrid');
  const input = document.getElementById('fileInput');
  document.getElementById('uploadBtn').addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    Array.from(input.files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo acima de 10 MB');
        return;
      }
      const url = URL.createObjectURL(file);
      const item = document.createElement('div');
      item.className = 'feed-item';
      item.innerHTML = `<img src="` + url + `" alt="foto" />`;
      item.addEventListener('click', () => {
        document.getElementById('bg').src = url;
      });
      feed.appendChild(item);
    });
  });
}

function initNav() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = {
    templates: document.getElementById('panel-templates'),
    midia: document.getElementById('panel-feed'),
    feed: document.getElementById('panel-feed'),
    elementos: document.getElementById('panel-add'),
    texto: document.getElementById('panel-add'),
    musica: null,
    ajustes: document.getElementById('panel-ajustes')
  };

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      const nav = item.dataset.nav;
      // Scroll to the corresponding section in the right panel
      const targetSection = sections[nav];
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        targetSection.style.transition = 'background 0.3s';
        targetSection.style.background = 'rgba(233, 196, 106, 0.1)';
        setTimeout(() => {
          targetSection.style.background = '';
        }, 1000);
      }
    });
  });
}

function initActions() {
  document.getElementById('clearBtn').addEventListener('click', () => { console.log('clearBtn'); Export.clear(); });
  document.getElementById('saveBtn').addEventListener('click', () => { console.log('saveBtn'); Export.save(); });
  document.getElementById('previewBtn').addEventListener('click', () => { console.log('previewBtn'); Export.preview(); });
  document.getElementById('exportBtn').addEventListener('click', () => { console.log('exportBtn'); Export.exportImage(); });

  document.querySelectorAll('.quick-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'add-text') Elements.createText('Título');
      if (action === 'add-sticker') Elements.createSticker('★');
      if (action === 'add-shape') Elements.createShape();
      if (action === 'add-line') Elements.createLine();
    });
  });
}

function init() {
  console.log('init app');
  initRatioToggle();
  initTabs();
  initFeed();
  initNav();
  initActions();
  Filters.init();
  Templates.init();
  DragDrop.init();
  Elements.init();
}

init();
