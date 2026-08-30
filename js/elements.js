window.Elements = {
  init() {
    const panel = document.getElementById('panel-style');
    const textEditorPanel = document.getElementById('textEditorPanel');
    const otherElementPanel = document.getElementById('otherElementPanel');
    const contentTextarea = document.getElementById('textContent');
    const colorInput = document.getElementById('textColor');
    const sizeInput = document.getElementById('textSize');
    const fontInput = document.getElementById('textFont');
    const sizeVal = document.getElementById('textSizeVal');
    const btnBold = document.getElementById('btnBold');
    const btnItalic = document.getElementById('btnItalic');
    const btnUnderline = document.getElementById('btnUnderline');
    const btnAlignLeft = document.getElementById('btnAlignLeft');
    const btnAlignCenter = document.getElementById('btnAlignCenter');
    const btnAlignRight = document.getElementById('btnAlignRight');

    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let textAlign = 'left';

    const updateStyle = () => {
      if (!window.State.selected) return;
      const el = window.State.selected;
      if (el.dataset.el === 'text') {
        el.style.color = colorInput.value;
        el.style.fontSize = sizeInput.value + 'px';
        el.style.fontFamily = fontInput.value;
        el.style.fontWeight = isBold ? 'bold' : 'normal';
        el.style.fontStyle = isItalic ? 'italic' : 'normal';
        el.style.textDecoration = isUnderline ? 'underline' : 'none';
        el.style.textAlign = textAlign;
        sizeVal.textContent = sizeInput.value;
      }
    };

    contentTextarea.addEventListener('input', () => {
      if (window.State.selected && window.State.selected.dataset.el === 'text') {
        window.State.selected.textContent = contentTextarea.value;
      }
    });

    colorInput.addEventListener('input', updateStyle);
    sizeInput.addEventListener('input', updateStyle);
    fontInput.addEventListener('change', updateStyle);

    btnBold.addEventListener('click', () => {
      isBold = !isBold;
      btnBold.style.background = isBold ? '#4a4331' : '';
      updateStyle();
    });

    btnItalic.addEventListener('click', () => {
      isItalic = !isItalic;
      btnItalic.style.background = isItalic ? '#4a4331' : '';
      updateStyle();
    });

    btnUnderline.addEventListener('click', () => {
      isUnderline = !isUnderline;
      btnUnderline.style.background = isUnderline ? '#4a4331' : '';
      updateStyle();
    });

    btnAlignLeft.addEventListener('click', () => { textAlign = 'left'; updateStyle(); });
    btnAlignCenter.addEventListener('click', () => { textAlign = 'center'; updateStyle(); });
    btnAlignRight.addEventListener('click', () => { textAlign = 'right'; updateStyle(); });

    document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
      if (window.State.selected) {
        window.State.selected.remove();
        window.State.selected = null;
        panel.style.display = 'none';
      }
    });

    document.getElementById('elements').addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-el]');
      if (el) {
        window.State.selected = el;
        panel.style.display = 'block';
        if (el.dataset.el === 'text') {
          textEditorPanel.style.display = 'block';
          otherElementPanel.style.display = 'none';
          // Load current styles
          contentTextarea.value = el.textContent;
          colorInput.value = el.style.color || '#3b2417';
          sizeInput.value = parseInt(el.style.fontSize) || 26;
          fontInput.value = el.style.fontFamily || 'ui-serif, Georgia, serif';
          sizeVal.textContent = sizeInput.value;
          isBold = el.style.fontWeight === 'bold';
          isItalic = el.style.fontStyle === 'italic';
          isUnderline = el.style.textDecoration === 'underline';
          textAlign = el.style.textAlign || 'left';
          btnBold.style.background = isBold ? '#4a4331' : '';
          btnItalic.style.background = isItalic ? '#4a4331' : '';
          btnUnderline.style.background = isUnderline ? '#4a4331' : '';
        } else {
          textEditorPanel.style.display = 'none';
          otherElementPanel.style.display = 'block';
        }
      }
    });
  },

  createText(content) {
    const el = document.createElement('div');
    el.textContent = content;
    el.dataset.el = 'text';
    el.style.cssText = `
      position:absolute;
      left:50%;
      top:40%;
      transform:translate(-50%,-50%);
      color:#3b2417;
      font-size:26px;
      font-weight:700;
      font-family: ui-serif, Georgia, serif;
      text-shadow: 0 1px 0 rgba(0,0,0,0.25);
      user-select:none;
      white-space:nowrap;
    `;
    document.getElementById('elements').appendChild(el);
    // Auto-select the new text element
    window.State.selected = el;
    document.getElementById('panel-style').style.display = 'block';
    document.getElementById('textEditorPanel').style.display = 'block';
    document.getElementById('otherElementPanel').style.display = 'none';
    document.getElementById('textContent').value = content;
  },

  createSticker(content) {
    const el = document.createElement('div');
    el.textContent = content;
    el.dataset.el = 'sticker';
    el.style.cssText = `
      position:absolute;
      left:60%;
      top:60%;
      transform:translate(-50%,-50%);
      font-size:36px;
      user-select:none;
    `;
    document.getElementById('elements').appendChild(el);
  },

  createShape() {
    const el = document.createElement('div');
    el.dataset.el = 'shape';
    el.style.cssText = `
      position:absolute;
      left:40%;
      top:55%;
      transform:translate(-50%,-50%);
      width:90px;
      height:90px;
      border-radius:20px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      user-select:none;
    `;
    document.getElementById('elements').appendChild(el);
  },

  createLine() {
    const el = document.createElement('div');
    el.dataset.el = 'line';
    el.style.cssText = `
      position:absolute;
      left:30%;
      top:45%;
      width:180px;
      height:1px;
      background:#ffffffcc;
      transform:translate(-50%,-50%) rotate(-8deg);
    `;
    document.getElementById('elements').appendChild(el);
  },
};
