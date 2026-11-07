// Explicit maintenance command only. Seed/application requests never fetch third-party images.
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const photos = require('./photos.json');
const root = path.resolve(__dirname, '../../..');

async function main() {
  const directory = path.join(root, '.cache/eventnexus-photo-sources');
  await fs.mkdir(directory, { recursive: true });
  const entries = Object.entries(photos);
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < entries.length) {
      const [key, photo] = entries[cursor++];
      {
        const filename = `${key}.webp`;
        const url = new URL(`https://images.pexels.com/photos/${photo.id}/pexels-photo-${photo.id}.jpeg`);
        url.search = new URLSearchParams({ auto: 'compress', cs: 'tinysrgb', w: '1600', fm: 'webp' });
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/webp')) throw new Error(`Photo download failed for ${key} (${response.status}).`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.length < 2000) throw new Error(`Invalid WebP for ${key}.`);
        await fs.writeFile(path.join(directory, filename), bytes);
      }
      console.log(`Downloaded source: ${key}`);
    }
  }));
  const prepared = spawnSync('python', [path.join(__dirname, 'prepare-photos.py')], { stdio: 'inherit' });
  if (prepared.error || prepared.status !== 0) throw new Error('Photo preparation requires Python with Pillow. Existing application/seed execution does not require Python.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
