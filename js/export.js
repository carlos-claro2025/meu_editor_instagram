window.Export = {
  clear() {
    const items = document.querySelectorAll('#elements > *');
    items.forEach((el) => el.remove());
  },

  save() {
    const data = new XMLSerializer().serializeToString(document);
    const blob = new Blob([data], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'story.html';
    a.click();
    URL.revokeObjectURL(url);
  },

  preview() {
    const win = window.open('', '_blank', 'width=420,height=740');
    if (!win) return alert('Permita pop-ups para pré-visualizar');
    win.document.write(document.documentElement.outerHTML);
    win.document.close();
  },

  async exportImage() {
    const el = document.getElementById('phone');
    if (typeof html2canvas === 'undefined') {
      return alert('Exportação indisponível no ambiente atual.');
    }
    try {
      const canvas = await html2canvas(el, { useCORS: true });
      const link = document.createElement('a');
      link.download = 'story.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert('Falha ao exportar imagem.');
    }
  },
};
