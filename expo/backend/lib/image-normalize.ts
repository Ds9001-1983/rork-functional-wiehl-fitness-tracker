import sharp from 'sharp';

const MAX_BYTES = 400 * 1024;
const TARGET_WIDTH = 1000;
const TARGET_HEIGHT = 1250;
const MIN_QUALITY = 40;

export async function normalizeExerciseImage(base64In: string): Promise<string> {
  const raw = base64In.includes(',') ? base64In.split(',')[1] : base64In;
  const buf = Buffer.from(raw, 'base64');

  let quality = 80;
  let out: Buffer = await encode(buf, quality);
  while (out.byteLength > MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 10;
    out = await encode(buf, quality);
  }
  return out.toString('base64');
}

async function encode(buf: Buffer, quality: number): Promise<Buffer> {
  return sharp(buf)
    .rotate()
    .resize({
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      fit: 'cover',
      withoutEnlargement: false,
    })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

export function looksLikeBase64Image(s: string | null | undefined): boolean {
  if (!s) return false;
  if (s.length < 100) return false;
  return /^[A-Za-z0-9+/=]+$/.test(s.slice(0, 100)) || s.startsWith('data:image/');
}
