import sharp from 'sharp';

// Compression obligatoire à l'upload pour toute photo (hors CNI dans
// id-documents, qui conserve sa qualité pour l'OCR — voir architecture.md).
export async function compressPhoto(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // applique l'orientation EXIF puis la supprime
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}
