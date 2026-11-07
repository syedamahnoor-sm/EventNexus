const fs = require('node:fs/promises');
const path = require('node:path');
const photos = require('./photos.json');
const { SeedSafetyError } = require('./safety');

async function validatePhotoAssets() {
  const root = path.resolve(__dirname, '../../../client/public');
  for (const photo of Object.values(photos)) {
    for (const url of [photo.imageUrl, photo.imageUrl.replace(/\.webp$/, '-640.webp')]) {
      let bytes;
      try { bytes = await fs.readFile(path.join(root, url.slice(1))); }
      catch { throw new SeedSafetyError('Local event photographs are missing. Restore the checked-in assets before updating seed data.'); }
      if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
        throw new SeedSafetyError('Invalid local event photograph. No seed data updated.');
      }
    }
  }
}

module.exports = { validatePhotoAssets };
