/**
 * Image comparison engine — pure client-side pixel analysis.
 * Supports: Side-by-side, Swipe, Onion Skin, and Pixel Difference modes.
 */

export type ImageCompareMode = 'side-by-side' | 'swipe' | 'onion' | 'difference';

export interface ImageDiffResult {
  diffPercentage: number;
  diffPixelCount: number;
  totalPixels: number;
  diffCanvas: HTMLCanvasElement | null;
}

/**
 * Load an image file into an HTMLImageElement.
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert an image URL to an HTMLImageElement.
 */
export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Get ImageData from an image, scaling to the target dimensions.
 */
function getImageData(img: HTMLImageElement, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Compute a pixel-level difference between two images.
 * Returns a diff canvas highlighting changed pixels in magenta.
 */
export function computeImageDiff(
  imgA: HTMLImageElement,
  imgB: HTMLImageElement,
  threshold: number = 30
): ImageDiffResult {
  const width = Math.max(imgA.naturalWidth, imgB.naturalWidth);
  const height = Math.max(imgA.naturalHeight, imgB.naturalHeight);

  const dataA = getImageData(imgA, width, height);
  const dataB = getImageData(imgB, width, height);

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const ctx = diffCanvas.getContext('2d')!;
  const diffImageData = ctx.createImageData(width, height);

  let diffPixelCount = 0;
  const totalPixels = width * height;

  for (let i = 0; i < dataA.data.length; i += 4) {
    const rDiff = Math.abs(dataA.data[i] - dataB.data[i]);
    const gDiff = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
    const bDiff = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
    const maxDiff = Math.max(rDiff, gDiff, bDiff);

    if (maxDiff > threshold) {
      // Highlight diff pixels in magenta
      diffImageData.data[i] = 255;     // R
      diffImageData.data[i + 1] = 0;   // G
      diffImageData.data[i + 2] = 255; // B
      diffImageData.data[i + 3] = 200; // A
      diffPixelCount++;
    } else {
      // Dim the identical pixels
      diffImageData.data[i] = dataA.data[i];
      diffImageData.data[i + 1] = dataA.data[i + 1];
      diffImageData.data[i + 2] = dataA.data[i + 2];
      diffImageData.data[i + 3] = 60;
    }
  }

  ctx.putImageData(diffImageData, 0, 0);

  return {
    diffPercentage: totalPixels > 0 ? Math.round((diffPixelCount / totalPixels) * 10000) / 100 : 0,
    diffPixelCount,
    totalPixels,
    diffCanvas,
  };
}

/**
 * Draw a swipe comparison on a canvas.
 */
export function drawSwipeComparison(
  canvas: HTMLCanvasElement,
  imgA: HTMLImageElement,
  imgB: HTMLImageElement,
  position: number // 0-1 representing the slider position
) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  const splitX = Math.round(width * position);

  // Draw image B on the right side
  ctx.drawImage(imgB, 0, 0, width, height);

  // Draw image A on the left side (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, splitX, height);
  ctx.clip();
  ctx.drawImage(imgA, 0, 0, width, height);
  ctx.restore();

  // Draw the divider line
  ctx.strokeStyle = '#3fb950';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(splitX, 0);
  ctx.lineTo(splitX, height);
  ctx.stroke();

  // Draw a handle
  ctx.fillStyle = '#3fb950';
  ctx.beginPath();
  ctx.arc(splitX, height / 2, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⇔', splitX, height / 2);
}

/**
 * Draw an onion skin overlay on a canvas.
 */
export function drawOnionSkin(
  canvas: HTMLCanvasElement,
  imgA: HTMLImageElement,
  imgB: HTMLImageElement,
  opacity: number // 0-1
) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  // Draw image A at full opacity
  ctx.globalAlpha = 1;
  ctx.drawImage(imgA, 0, 0, width, height);

  // Overlay image B with variable opacity
  ctx.globalAlpha = opacity;
  ctx.drawImage(imgB, 0, 0, width, height);

  ctx.globalAlpha = 1;
}
