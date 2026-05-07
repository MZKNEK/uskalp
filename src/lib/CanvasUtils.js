import Pica from 'pica';
const picaResizer = new Pica();

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

const createBlobUrl = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (!file) reject(new Error('Failed to create blob from canvas'))
      else resolve(URL.createObjectURL(file))
    }, 'image/png')
  })

const setHighQualitySmoothing = (ctx) => {
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
}

const resizeCanvas = (source, width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  setHighQualitySmoothing(ctx)
  ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height)
  return canvas
}

const progressiveResize = (image, width, height) => {
  if (image.width <= width && image.height <= height) {
    return resizeCanvas(image, width, height)
  }

  let currentCanvas = document.createElement('canvas')
  currentCanvas.width = image.width
  currentCanvas.height = image.height
  let currentCtx = currentCanvas.getContext('2d')
  setHighQualitySmoothing(currentCtx)
  currentCtx.drawImage(image, 0, 0)

  while (currentCanvas.width * 0.5 > width || currentCanvas.height * 0.5 > height) {
    const nextWidth = Math.max(width, Math.round(currentCanvas.width * 0.5))
    const nextHeight = Math.max(height, Math.round(currentCanvas.height * 0.5))
    const nextCanvas = document.createElement('canvas')
    nextCanvas.width = nextWidth
    nextCanvas.height = nextHeight
    const nextCtx = nextCanvas.getContext('2d')
    setHighQualitySmoothing(nextCtx)
    nextCtx.drawImage(currentCanvas, 0, 0, currentCanvas.width, currentCanvas.height, 0, 0, nextWidth, nextHeight)
    currentCanvas = nextCanvas
  }

  return resizeCanvas(currentCanvas, width, height)
}

export async function getMirroredImg(imageSrc) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  canvas.width = image.width
  canvas.height = image.height

  ctx.scale(-1, 1)
  ctx.drawImage(image, 0, 0, image.width * -1, image.height)

  return createBlobUrl(canvas)
}

/**
 * @param {string} imageSrc - URL obrazka użytkownika
 * @param {Object} pixelCrop - dane z svelte-easy-crop (x, y, width, height)
 * @param {string} maskSrc - URL do pliku maski PNG (475x667)
 */
export async function getCroppedImg(imageSrc, pixelCrop, maskSrc = null) {
  const image = await createImage(imageSrc);

  // Krok 1: wytnij kadr w naturalnej rozdzielczości (bez skalowania)
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.round(pixelCrop.width);
  cropCanvas.height = Math.round(pixelCrop.height);
  const cropCtx = cropCanvas.getContext('2d');
  setHighQualitySmoothing(cropCtx);
  cropCtx.drawImage(
    image,
    Math.round(pixelCrop.x), Math.round(pixelCrop.y), Math.round(pixelCrop.width), Math.round(pixelCrop.height),
    0, 0, Math.round(pixelCrop.width), Math.round(pixelCrop.height)
  );

  // Krok 2: skaluj do 475x667 (Lanczos bez wyostrzania, lub kopia 1:1)
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = 475;
  targetCanvas.height = 667;
  if (cropCanvas.width === 475 && cropCanvas.height === 667) {
    const targetCtx = targetCanvas.getContext('2d');
    targetCtx.drawImage(cropCanvas, 0, 0);
  }
  else {
    await picaResizer.resize(cropCanvas, targetCanvas, {
      quality: 3,
      alpha: true,
    });
  }
  // Krok 3: nałóż maskę (jeśli jest)
  if (maskSrc) {
    const ctx = targetCanvas.getContext('2d');
    const mask = await createImage(maskSrc);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0, 475, 667);
    ctx.globalCompositeOperation = 'source-over';
  }

  return createBlobUrl(targetCanvas);
}

export async function getResizedImg(imageSrc, width, height) {
  const image = await createImage(imageSrc)
  const targetCanvas = progressiveResize(image, width, height)
  return createBlobUrl(targetCanvas)
}