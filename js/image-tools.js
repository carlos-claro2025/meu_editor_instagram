window.ImageTools = {
  async prepareFile(file, maxDimension = 2048) {
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Não foi possível carregar a imagem'));
      });
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', 0.9);
    } finally {
      URL.revokeObjectURL(source);
    }
  }
};
