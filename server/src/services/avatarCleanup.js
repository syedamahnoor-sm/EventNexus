const AvatarCleanup = require('../models/AvatarCleanup');
const User = require('../models/User');
async function cleanupAvatar(key, store) {
    // Never delete a currently referenced image, including a recovered upload.
    if (await User.exists({ 'profilePhoto.key': key })) return false;
    try {
        await store.remove(key);
        await AvatarCleanup.deleteOne({ key });
        return true;
    } catch {
        // Keep the journal entry for the explicit retry command; no credential logging.
        return false;
    }
}
module.exports = { cleanupAvatar };
