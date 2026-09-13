const MusicPlayer = (() => {
  let audio = null;
  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let animationId = null;
  let isPlaying = false;

  function playBtnEl() { return document.getElementById('musicPlayBtn'); }

  function init() {
    const uploadBtn = document.getElementById('musicUploadBtn');
    const fileInput = document.getElementById('musicFileInput');
    const playBtn = document.getElementById('musicPlayBtn');
    const stopBtn = document.getElementById('musicStopBtn');
    const volumeSlider = document.getElementById('musicVolume');

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (file) loadMusic(file);
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', togglePlay);
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', stopMusic);
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        setVolume(Number(e.target.value) / 100);
      });
    }
  }

  function loadMusic(file) {
    stopMusic();

    // Sem esta limpeza, cada upload criava um AudioContext novo (o navegador
    // limita a ~6) e vazava a blob URL da faixa anterior
    if (audio) {
      try { audio.src = ''; } catch (e) {}
      if (audio.dataset && audio.dataset.blobUrl) {
        try { URL.revokeObjectURL(audio.dataset.blobUrl); } catch (e) {}
      }
    }
    if (sourceNode) { try { sourceNode.disconnect(); } catch (e) {} sourceNode = null; }
    if (analyser) { try { analyser.disconnect(); } catch (e) {} analyser = null; }
    if (audioContext) { try { audioContext.close(); } catch (e) {} audioContext = null; }

    audio = new Audio();
    audio.volume = (Number(document.getElementById('musicVolume')?.value) || 80) / 100;

    const url = URL.createObjectURL(file);
    audio.src = url;
    audio.dataset.blobUrl = url;

    const titleEl = document.getElementById('musicTitle');
    if (titleEl) titleEl.textContent = file.name.replace(/\.[^/.]+$/, '');
    const playerEl = document.getElementById('musicPlayer');
    if (playerEl) playerEl.style.display = 'block';
    const uploadEl = document.getElementById('musicUpload');
    if (uploadEl) uploadEl.style.display = 'none';

    setupAudioContext();

    audio.addEventListener('loadedmetadata', () => {
      updateTimeLabel();
      drawWaveform();
    });

    // Antes o rótulo mostrava só a duração total e nunca mudava
    audio.addEventListener('timeupdate', updateTimeLabel);

    audio.addEventListener('error', () => {
      if (window.showToast) window.showToast('Não foi possível carregar este áudio', 2600, 'error');
    });

    audio.addEventListener('ended', () => {
      isPlaying = false;
      const btn = playBtnEl();
      if (btn) btn.textContent = '▶';
      updateTimeLabel();
    });
  }

  function updateTimeLabel() {
    const durEl = document.getElementById('musicDuration');
    if (!durEl || !audio) return;
    durEl.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
  }

  function setupAudioContext() {
    if (!audio) return;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      sourceNode = audioContext.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  function togglePlay() {
    if (!audio) {
      if (window.showToast) window.showToast('Envie um arquivo de áudio primeiro', 2000, 'info');
      return;
    }
    const btn = playBtnEl();

    if (isPlaying) {
      audio.pause();
      if (animationId) cancelAnimationFrame(animationId);
      isPlaying = false;
      if (btn) btn.textContent = '▶';
    } else {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const p = audio.play();
      if (p && p.catch) p.catch(() => { if (btn) btn.textContent = '▶'; isPlaying = false; });
      isPlaying = true;
      if (btn) btn.textContent = '⏸';
      animateWaveform();
    }
  }

  function stopMusic() {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    isPlaying = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    const playBtn = document.getElementById('musicPlayBtn');
    if (playBtn) playBtn.textContent = '▶';
    updateTimeLabel();
    drawWaveform();
  }

  function setVolume(value) {
    if (audio) {
      audio.volume = value;
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function animateWaveform() {
    if (!analyser) return;

    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, '#e9c46a');
        gradient.addColorStop(1, '#a38a2c');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    }

    draw();
  }

  function drawWaveform() {
    const canvas = document.getElementById('waveformCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barCount = 50;
    const barWidth = canvas.width / barCount;

    // Placeholder estável (sem Math.random) até o áudio tocar e o analyser assumir
    for (let i = 0; i < barCount; i++) {
      const t = i / (barCount - 1);
      const wave = 0.35 + 0.3 * Math.abs(Math.sin(t * Math.PI * 3)) + 0.2 * Math.abs(Math.sin(t * Math.PI * 7));
      const height = Math.min(canvas.height * 0.9, canvas.height * wave);
      const y = (canvas.height - height) / 2;
      ctx.fillStyle = 'rgba(233, 196, 106, 0.35)';
      ctx.fillRect(i * barWidth + 1, y, Math.max(1, barWidth - 2), height);
    }
  }

  return { init };
})();
window.MusicPlayer = MusicPlayer;
window.Music = MusicPlayer;
