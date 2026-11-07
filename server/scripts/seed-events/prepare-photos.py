"""Maintenance-only cropping of licensed sources; no generated or synthetic imagery."""
import json
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[3]
photos = json.loads(Path(__file__).with_name('photos.json').read_text(encoding='utf-8'))
destination = root / 'client/public/images/events'
destination.mkdir(parents=True, exist_ok=True)

for key, photo in photos.items():
    with Image.open(root / '.cache/eventnexus-photo-sources' / f'{key}.webp') as source:
        source = ImageOps.exif_transpose(source).convert('RGB')
        cropped = ImageOps.fit(source, (1280, 800), Image.Resampling.LANCZOS, centering=tuple(photo['cropCenter']))
        cropped.save(destination / f'{key}.webp', 'WEBP', quality=82, method=6)
        cropped.resize((640, 400), Image.Resampling.LANCZOS).save(destination / f'{key}-640.webp', 'WEBP', quality=80, method=6)
    print(f'Prepared {key}: 1280x800 + 640x400')
