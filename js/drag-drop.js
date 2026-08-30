window.DragDrop = {
  init() {
    const phone = document.getElementById('phone');
    phone.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-el]');
      if (!el) return;
      e.preventDefault();
      window.State.selected = el;
      el.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const box = el.getBoundingClientRect();
      const phoneBox = phone.getBoundingClientRect();
      const offsetX = (startX - box.left) / box.width;
      const offsetY = (startY - box.top) / box.height;
      const startLeft = (box.left - phoneBox.left) / phoneBox.width * 100;
      const startTop = (box.top - phoneBox.top) / phoneBox.height * 100;

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        el.style.left = `${startLeft + (dx / phoneBox.width) * 100}%`;
        el.style.top = `${startTop + (dy / phoneBox.height) * 100}%`;
      };
      const onUp = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
    });
  },
};
