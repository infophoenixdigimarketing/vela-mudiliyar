// Prepares card images so html2canvas renders them exactly right:
// - watermark: baked into a SQUARE canvas (never oval), grayscale + faint, pre-applied
//   (html2canvas ignores CSS `filter`, so faintness must be baked into the pixels)
// - signature: white background removed so it never covers text behind it

async function toDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise(resolve => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function makeWatermark(sealDataUrl) {
  try {
    const img = await loadImage(sealDataUrl);
    const SIZE = 400;
    const c = document.createElement('canvas');
    c.width = SIZE;
    c.height = SIZE;
    const ctx = c.getContext('2d');
    // Preserve aspect ratio inside the square — keeps the seal perfectly round
    const scale = Math.min(SIZE / img.width, SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.filter = 'grayscale(1) brightness(1.2)';
    ctx.globalAlpha = 0.1;
    ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    return c.toDataURL('image/png');
  } catch {
    return '';
  }
}

async function makeTransparent(dataUrl) {
  try {
    const img = await loadImage(dataUrl);
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      // near-white pixels become fully transparent
      if (d.data[i] > 225 && d.data[i + 1] > 225 && d.data[i + 2] > 225) {
        d.data[i + 3] = 0;
      }
    }
    ctx.putImageData(d, 0, 0);
    return c.toDataURL('image/png');
  } catch {
    return dataUrl;
  }
}

export async function loadCardAssets() {
  let sealDataUrl = '';
  try {
    sealDataUrl = await toDataUrl('/assets/seal.png');
  } catch { /* no seal available */ }

  const watermarkDataUrl = sealDataUrl ? await makeWatermark(sealDataUrl) : '';

  let signRaw = localStorage.getItem('secretarySignature') || '';
  if (!signRaw) {
    try {
      signRaw = await toDataUrl('/assets/sign.png');
    } catch { /* no signature available */ }
  }
  const signDataUrl = signRaw ? await makeTransparent(signRaw) : '';

  return { sealDataUrl, watermarkDataUrl, signDataUrl };
}
