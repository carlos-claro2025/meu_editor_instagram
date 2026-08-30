window.Filters = {
  init() {
    document.getElementById('filterGrid').addEventListener('click', (e) => {
      const card = e.target.closest('.filter-card');
      if (!card) return;
      document.querySelectorAll('.filter-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      window.State.filter = card.dataset.filter || 'none';
      this.apply();
    });

    const onInput = (id, key) => {
      const input = document.getElementById(id);
      const val = document.getElementById(id + 'Val');
      input.addEventListener('input', () => {
        window.State[key] = Number(input.value);
        val.textContent = input.value;
        this.apply();
      });
    };

    onInput('brightness', 'brightness');
    onInput('saturation', 'saturation');
    onInput('zoom', 'zoom');

    document.getElementById('resetAdjustmentsBtn').addEventListener('click', () => {
      window.State.brightness = 100;
      window.State.saturation = 100;
      window.State.zoom = 100;
      document.getElementById('brightness').value = 100;
      document.getElementById('saturation').value = 100;
      document.getElementById('zoom').value = 100;
      document.getElementById('brightnessVal').textContent = '100';
      document.getElementById('saturationVal').textContent = '100';
      document.getElementById('zoomVal').textContent = '100';
      this.apply();
    });
  },

  apply() {
    const bg = document.getElementById('bg');
    const filterParts = [
      window.State.filter === 'none' ? 'none' : '',
      `brightness(${window.State.brightness}%)`,
      `saturate(${window.State.saturation}%)`,
    ].filter(Boolean);
    bg.style.filter = filterParts.join(' ');
    bg.style.transform = `scale(${window.State.zoom / 100})`;
  },
};
