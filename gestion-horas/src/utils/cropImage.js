export default async function getCroppedImg(imageSrc, pixelCrop) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Comprimir y devolver como Blob en formato WebP
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], 'avatar.webp', { type: 'image/webp' });
      resolve(file);
    }, 'image/webp', 0.6); // 60% de calidad para ahorrar espacio
  });
}
