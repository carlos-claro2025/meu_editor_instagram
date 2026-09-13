const Elements = (() => {
  function showPanel(el) {
    const panel = document.getElementById('panel-style');
    const textEditorPanel = document.getElementById('textEditorPanel');
    const otherElementPanel = document.getElementById('otherElementPanel');
    const contentTextarea = document.getElementById('textContent');
    const colorInput = document.getElementById('textColor');
    const sizeInput = document.getElementById('textSize');
    const fontInput = document.getElementById('textFont');
    const sizeVal = document.getElementById('textSizeVal');
    
    if (!panel) return;
    panel.style.display = 'block';
    
    if (el?.dataset.el === 'text') {
      if (textEditorPanel) textEditorPanel.style.display = 'block';
      if (otherElementPanel) otherElementPanel.style.display = 'none';
      if (contentTextarea) contentTextarea.value = el.textContent;
      if (colorInput) colorInput.value = rgbToHex(el.style.color) || '#ffffff';
      if (sizeInput) sizeInput.value = parseInt(el.style.fontSize) || 26;
      if (fontInput) fontInput.value = el.style.fontFamily || 'ui-serif, Georgia, serif';
      if (sizeVal && sizeInput) sizeVal.textContent = sizeInput.value;
    } else {
      if (textEditorPanel) textEditorPanel.style.display = 'none';
      if (otherElementPanel) otherElementPanel.style.display = 'block';
      if (el) syncShapePanel(el);
    }
    const props = document.getElementById('panel-properties');
    if (props) props.style.display = el ? 'block' : 'none';
    if (window.Resize?.updatePropertiesPanel) window.Resize.updatePropertiesPanel();
  }

  function init() {
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
      if (!window.State?.selected) return;
      const el = window.State.selected;
      if (el?.dataset.el === 'text') {
        if (colorInput) el.style.color = colorInput.value;
        if (sizeInput) el.style.fontSize = sizeInput.value + 'px';
        if (fontInput) el.style.fontFamily = fontInput.value;
        el.style.fontWeight = isBold ? 'bold' : 'normal';
        el.style.fontStyle = isItalic ? 'italic' : 'normal';
        el.style.textDecoration = isUnderline ? 'underline' : 'none';
        el.style.textAlign = textAlign;
        if (sizeVal && sizeInput) sizeVal.textContent = sizeInput.value;
      }
    };

    contentTextarea?.addEventListener('input', () => {
      if (window.State?.selected && window.State.selected.dataset.el === 'text') {
        window.State.selected.textContent = contentTextarea.value;
        if (window.Layers?.render) window.Layers.render();
        if (window.Resize?.reposition) window.Resize.reposition();
      }
    });

    // Histórico só no fim da digitação
    contentTextarea?.addEventListener('change', () => {
      if (window.History?.push) window.History.push('text-edit');
    });

    colorInput?.addEventListener('input', updateStyle);
    sizeInput?.addEventListener('input', updateStyle);
    fontInput?.addEventListener('change', updateStyle);
    [colorInput, sizeInput, fontInput].forEach(input => {
      input?.addEventListener('change', () => {
        if (window.History?.push) window.History.push('style-change');
      });
    });

    btnBold?.addEventListener('click', () => {
      isBold = !isBold;
      btnBold.classList.toggle('active', isBold);
      updateStyle();
      if (window.History?.push) window.History.push('style-change');
    });

    btnItalic?.addEventListener('click', () => {
      isItalic = !isItalic;
      btnItalic.classList.toggle('active', isItalic);
      updateStyle();
      if (window.History?.push) window.History.push('style-change');
    });

    btnUnderline?.addEventListener('click', () => {
      isUnderline = !isUnderline;
      btnUnderline.classList.toggle('active', isUnderline);
      updateStyle();
      if (window.History?.push) window.History.push('style-change');
    });

    const setAlign = (value, btn) => {
      textAlign = value;
      [btnAlignLeft, btnAlignCenter, btnAlignRight].forEach(b => b?.classList.remove('active'));
      btn?.classList.add('active');
      updateStyle();
      if (window.History?.push) window.History.push('style-change');
    };
    btnAlignLeft?.addEventListener('click', () => setAlign('left', btnAlignLeft));
    btnAlignCenter?.addEventListener('click', () => setAlign('center', btnAlignCenter));
    btnAlignRight?.addEventListener('click', () => setAlign('right', btnAlignRight));

    // Selection handler for elements
    document.getElementById('elements')?.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-el]');
      if (el) {
        if (el.dataset.locked === 'true') return;
        e.stopPropagation();
        window.State.selected = el;
        panel.style.display = 'block';
        if (el.dataset.el === 'text') {
          if (textEditorPanel) textEditorPanel.style.display = 'block';
          if (otherElementPanel) otherElementPanel.style.display = 'none';
          if (contentTextarea) contentTextarea.value = el.textContent;
          if (colorInput) colorInput.value = rgbToHex(el.style.color) || '#ffffff';
          if (sizeInput) sizeInput.value = parseInt(el.style.fontSize) || 26;
          if (fontInput) fontInput.value = el.style.fontFamily || 'ui-serif, Georgia, serif';
          if (sizeVal && sizeInput) sizeVal.textContent = sizeInput.value;
          isBold = el.style.fontWeight === 'bold' || Number(el.style.fontWeight) >= 600;
          isItalic = el.style.fontStyle === 'italic';
          isUnderline = (el.style.textDecoration || '').indexOf('underline') !== -1;
          textAlign = el.style.textAlign || 'left';
          btnBold?.classList.toggle('active', isBold);
          btnItalic?.classList.toggle('active', isItalic);
          btnUnderline?.classList.toggle('active', isUnderline);
        } else {
          if (textEditorPanel) textEditorPanel.style.display = 'none';
          if (otherElementPanel) otherElementPanel.style.display = 'block';
          syncShapePanel(el);
        }
        const props = document.getElementById('panel-properties');
        if (props) props.style.display = 'block';
        if (window.Resize?.showHandles) window.Resize.showHandles(el);
        if (window.Layers?.render) window.Layers.render();
      }
    });

    // Deselect when clicking outside (não mexe ao clicar em células/painéis)
    document.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-el]')) return;
      if (e.target.closest('#panel-style')) return;
      if (e.target.closest('#panel-properties')) return;
      if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle')) return;
      if (e.target.closest('.side')) return;
      if (e.target.closest('.topbar')) return;
      window.State.selected = null;
      panel.style.display = 'none';
      const props = document.getElementById('panel-properties');
      if (props) props.style.display = 'none';
      if (window.Resize?.hideHandles) window.Resize.hideHandles();
      if (window.Layers?.render) window.Layers.render();
    });

    initShapePanel();
    initLayerButtons();
    initRotation();
  }

  function initLayerButtons() {
    document.getElementById('btnLayerUp')?.addEventListener('click', () => {
      const el = window.State?.selected;
      if (!el) { if (window.showToast) window.showToast('Selecione um elemento primeiro', 2000, 'info'); return; }
      if (!el.nextElementSibling) { if (window.showToast) window.showToast('Já está na frente', 1600, 'info'); return; }
      el.parentElement.insertBefore(el.nextElementSibling, el);
      if (window.Layers?.render) window.Layers.render();
      if (window.History?.push) window.History.push('reorder');
    });
    document.getElementById('btnLayerDown')?.addEventListener('click', () => {
      const el = window.State?.selected;
      if (!el) { if (window.showToast) window.showToast('Selecione um elemento primeiro', 2000, 'info'); return; }
      if (!el.previousElementSibling) { if (window.showToast) window.showToast('Já está atrás', 1600, 'info'); return; }
      el.parentElement.insertBefore(el, el.previousElementSibling);
      if (window.Layers?.render) window.Layers.render();
      if (window.History?.push) window.History.push('reorder');
    });
    document.getElementById('duplicateSelectedBtn')?.addEventListener('click', () => {
      if (!window.State?.selected) {
        if (window.showToast) window.showToast('Selecione um elemento primeiro', 2000, 'info');
        return;
      }
      duplicateSelected();
    });
  }

  // Duplica o elemento selecionado com um pequeno deslocamento
  function duplicateSelected() {
    const el = window.State?.selected;
    if (!el) return null;
    const clone = el.cloneNode(true);
    clone.id = 'el-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    delete clone.dataset.draggableBound;
    delete clone.dataset.inlineEditBound;
    clone.contentEditable = 'false';
    const unit = (clone.style.left || '').indexOf('%') !== -1 ? '%' : 'px';
    const curL = parseFloat(clone.style.left) || 0;
    const curT = parseFloat(clone.style.top) || 0;
    clone.style.left = (curL + (unit === '%' ? 4 : 20)) + unit;
    clone.style.top = (curT + (unit === '%' ? 4 : 20)) + unit;
    el.parentElement.appendChild(clone);
    makeDraggable(clone);
    window.State.selected = clone;
    if (window.Resize?.showHandles) window.Resize.showHandles(clone);
    if (window.Layers?.render) window.Layers.render();
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (window.History?.push) window.History.push('duplicate');
    if (window.showToast) window.showToast('Elemento duplicado', 1400, 'success');
    return clone;
  }

  // Rotação do elemento não-texto
  function initRotation() {
    const rot = document.getElementById('shapeRotation');
    const rotVal = document.getElementById('shapeRotationVal');
    rot?.addEventListener('input', () => {
      if (rotVal) rotVal.textContent = rot.value;
      const el = window.State?.selected;
      if (!el) return;
      el.dataset.rotation = rot.value;
      el.style.transform = `translate(-50%, -50%) rotate(${rot.value}deg)`;
      if (window.Resize?.reposition) window.Resize.reposition();
      if (window.Resize?.updatePropertiesPanel) window.Resize.updatePropertiesPanel();
    });
  }

  function rgbToHex(color) {
    if (!color) return null;
    if (color.charAt(0) === '#') return color;
    const m = color.match(/\d+/g);
    if (!m || m.length < 3) return null;
    return '#' + m.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('');
  }

  // Painel de forma/adesivo: cor, tamanho e opacidade do elemento não-texto
  function syncShapePanel(el) {
    const color = document.getElementById('shapeColor');
    const size = document.getElementById('shapeSize');
    const sizeVal = document.getElementById('shapeSizeVal');
    const opacity = document.getElementById('shapeOpacity');
    const opacityVal = document.getElementById('shapeOpacityVal');
    if (color) {
      const c = el.dataset.el === 'sticker' || el.dataset.el === 'text'
        ? rgbToHex(el.style.color)
        : rgbToHex(el.style.background || el.style.backgroundColor);
      color.value = c || '#ffffff';
    }
    if (size) {
      const px = el.dataset.el === 'sticker'
        ? parseInt(el.style.fontSize) || 36
        : parseInt(el.style.width) || 90;
      size.value = Math.min(Number(size.max) || 400, Math.max(Number(size.min) || 10, px));
      if (sizeVal) sizeVal.textContent = size.value;
    }
    if (opacity) {
      const o = Math.round((el.style.opacity === '' ? 1 : Number(el.style.opacity)) * 100);
      opacity.value = o;
      if (opacityVal) opacityVal.textContent = o;
    }
    const rot = document.getElementById('shapeRotation');
    const rotVal = document.getElementById('shapeRotationVal');
    if (rot) {
      const r = Number(el.dataset.rotation || 0);
      rot.value = r;
      if (rotVal) rotVal.textContent = r;
    }
  }

  function initShapePanel() {
    const color = document.getElementById('shapeColor');
    const size = document.getElementById('shapeSize');
    const sizeVal = document.getElementById('shapeSizeVal');
    const opacity = document.getElementById('shapeOpacity');
    const opacityVal = document.getElementById('shapeOpacityVal');

    color?.addEventListener('input', () => {
      const el = window.State?.selected;
      if (!el || el.dataset.el === 'text') return;
      if (el.dataset.el === 'sticker') el.style.color = color.value;
      else el.style.background = color.value;
    });

    size?.addEventListener('input', () => {
      const el = window.State?.selected;
      if (sizeVal) sizeVal.textContent = size.value;
      if (!el || el.dataset.el === 'text') return;
      if (el.dataset.el === 'sticker') {
        el.style.fontSize = size.value + 'px';
      } else if (el.dataset.el === 'line') {
        el.style.width = size.value + 'px';
      } else {
        el.style.width = size.value + 'px';
        el.style.height = size.value + 'px';
      }
      if (window.Resize?.reposition) window.Resize.reposition();
    });

    opacity?.addEventListener('input', () => {
      const el = window.State?.selected;
      if (opacityVal) opacityVal.textContent = opacity.value;
      if (!el) return;
      el.style.opacity = Number(opacity.value) / 100;
    });

    // Um passo de histórico por ajuste concluído, não por pixel arrastado
    [color, size, opacity, document.getElementById('shapeRotation')].forEach(input => {
      input?.addEventListener('change', () => {
        if (window.State?.selected && window.History?.push) window.History.push('style-change');
      });
    });
  }

  // Insere o elemento no canvas e deixa tudo em sincronia (seleção, alças, camadas)
  function place(el, opts) {
    const container = document.getElementById('elements');
    if (!container) return null;
    if (!el.id) el.id = 'el-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    makeDraggable(el);
    container.appendChild(el);
    window.State.selected = el;
    showPanel(el);
    if (el.dataset.el !== 'text') syncShapePanel(el);
    if (window.Resize?.showHandles) window.Resize.showHandles(el);
    if (window.Layers?.render) window.Layers.render();
    if (typeof updateStatusBar === 'function') updateStatusBar();
    if (!opts?.silent && window.showToast) window.showToast(opts?.message || 'Elemento adicionado', 1400, 'success');
    return el;
  }

  function createText(content) {
    const el = document.createElement('div');
    el.textContent = content;
    el.dataset.el = 'text';
    el.style.cssText = `
      position:absolute;
      left:50%;
      top:40%;
      transform:translate(-50%,-50%);
      color:#ffffff;
      font-size:26px;
      font-weight:700;
      font-family: ui-serif, Georgia, serif;
      text-shadow: 0 1px 0 rgba(0,0,0,0.25);
      user-select:none;
      white-space:nowrap;
      cursor:move;
      padding: 4px 8px;
      border-radius: 4px;
    `;
    enableInlineEdit(el);
    place(el, { message: 'Texto adicionado — dê duplo clique para editar no canvas' });
    const ta = document.getElementById('textContent');
    if (ta) ta.value = content;
    return el;
  }

  // Duplo clique no texto edita direto no canvas
  function enableInlineEdit(el) {
    if (el.dataset.inlineEditBound === 'true') return;
    el.dataset.inlineEditBound = 'true';
    let textBefore = '';
    el.addEventListener('dblclick', (e) => {
      if (el.dataset.locked === 'true') return;
      e.stopPropagation();
      textBefore = el.textContent;
      el.contentEditable = 'true';
      el.style.userSelect = 'text';
      el.style.cursor = 'text';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    el.addEventListener('blur', () => {
      if (el.contentEditable !== 'true') return;
      el.contentEditable = 'false';
      el.style.userSelect = 'none';
      el.style.cursor = 'move';
      const ta = document.getElementById('textContent');
      if (ta && window.State?.selected === el) ta.value = el.textContent;
      if (window.Layers?.render) window.Layers.render();
      // Só registra no histórico se o texto realmente mudou
      if (el.textContent !== textBefore && window.History?.push) window.History.push('text-edit');
      if (window.Resize?.reposition) window.Resize.reposition();
    });
    el.addEventListener('keydown', (e) => {
      if (el.contentEditable !== 'true') return;
      e.stopPropagation();
      if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        el.blur();
      }
    });
  }

  function createSticker(content) {
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
      cursor:move;
    `;
    return place(el, { message: 'Adesivo adicionado' });
  }

  function createShape() {
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
      cursor:move;
    `;
    return place(el, { message: 'Forma adicionada' });
  }

  function createLine() {
    const el = document.createElement('div');
    el.dataset.el = 'line';
    el.dataset.rotation = '-8';
    el.style.cssText = `
      position:absolute;
      left:30%;
      top:45%;
      width:180px;
      height:3px;
      background:#ffffffcc;
      transform:translate(-50%,-50%) rotate(-8deg);
      border-radius: 2px;
      cursor:move;
    `;
    return place(el, { message: 'Linha adicionada' });
  }

  function makeDraggable(el) {
    if (!el || el.dataset.draggableBound === 'true') return;
    el.dataset.draggableBound = 'true';
    if (el.dataset.el === 'text') enableInlineEdit(el);
    let startX, startY, initLeft, initTop, moved;

    el.addEventListener('pointerdown', (e) => {
      if (el.dataset.locked === 'true') return;
      if (el.contentEditable === 'true') return;
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      const rect = el.getBoundingClientRect();
      const parentRect = el.parentElement.getBoundingClientRect();
      initLeft = rect.left - parentRect.left + rect.width / 2;
      initTop = rect.top - parentRect.top + rect.height / 2;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });

    function onMove(e) {
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      // Shift trava o movimento no eixo dominante
      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
      }
      el.style.left = `${initLeft + dx}px`;
      el.style.top = `${initTop + dy}px`;
      const rot = el.dataset.rotation ? ` rotate(${el.dataset.rotation}deg)` : '';
      el.style.transform = `translate(-50%, -50%)${rot}`;
      if (window.Resize?.reposition) window.Resize.reposition();
      if (window.Resize?.updatePropertiesPanel) window.Resize.updatePropertiesPanel();
    }

    function onUp() {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      // Só registra no histórico se o elemento realmente saiu do lugar
      if (moved && window.History?.push) window.History.push('move');
      moved = false;
    }
  }

  return { createText, createSticker, createShape, createLine, init, showPanel, hydrate: makeDraggable, duplicateSelected, syncShapePanel };
})();
window.Elements = Elements;
