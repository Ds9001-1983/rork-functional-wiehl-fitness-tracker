import sharp from 'sharp';
import path from 'path';

const SRC_LOGO = path.resolve(__dirname, '..', 'assets', 'images', 'icon.png');
const OUT_DIR = path.resolve(__dirname, '..', 'assets', 'play-store');

async function makeIcon512() {
  const out = path.join(OUT_DIR, 'icon-512.png');
  await sharp(SRC_LOGO)
    .resize(512, 512, { fit: 'contain', background: '#000000' })
    .toColorspace('srgb')
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ Icon 512×512 → ${out}`);
}

async function makeFeatureGraphic() {
  const out = path.join(OUT_DIR, 'feature-graphic-1024x500.png');

  const logoBuffer = await sharp(SRC_LOGO)
    .resize(420, 420, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toColorspace('srgb')
    .ensureAlpha()
    .png()
    .toBuffer();

  const textSvg = `
    <svg width="540" height="500" xmlns="http://www.w3.org/2000/svg">
      <style>
        .headline {
          font-family: 'Helvetica Neue', 'Arial Black', sans-serif;
          font-weight: 900;
          font-size: 64px;
          fill: #FFFFFF;
          letter-spacing: -1px;
        }
        .subline {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-weight: 400;
          font-size: 28px;
          fill: #B0B0B0;
          letter-spacing: 0.5px;
        }
      </style>
      <text x="0" y="230" class="headline">DEIN STUDIO.</text>
      <text x="0" y="305" class="headline">DEIN TRACKER.</text>
      <text x="0" y="360" class="subline">Functional Wiehl Fitness</text>
    </svg>
  `;

  await sharp({
    create: {
      width: 1024,
      height: 500,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([
      { input: logoBuffer, left: 40, top: 40 },
      { input: Buffer.from(textSvg), left: 460, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(out);

  console.log(`✓ Feature Graphic 1024×500 → ${out}`);
}

(async () => {
  await makeIcon512();
  await makeFeatureGraphic();
})();
