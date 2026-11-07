export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function photoSelectionError(file) {
  if (!PHOTO_TYPES.includes(file.type)) return 'Choose a JPEG, PNG or WebP photo.';
  if (!file.size || file.size > MAX_PHOTO_BYTES) return 'Choose a photo between 1 byte and 5 MB.';
  return null;
}
