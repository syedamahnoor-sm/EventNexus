require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const AvatarCleanup = require('../src/models/AvatarCleanup');
const { createAvatarStorage } = require('../src/services/avatarStorage');
const { cleanupAvatar } = require('../src/services/avatarCleanup');
(async () => {
    try {
        const store = createAvatarStorage();
        if (!store) throw new Error('Configure Cloudinary before running avatar cleanup.');
        await require('../src/config/db')({ throwOnError: true });
        const jobs = await AvatarCleanup.find({ availableAt: { $lte: new Date() } }).limit(100).lean();
        let removed = 0;
        for (const job of jobs) {
            if (await User.exists({ 'profilePhoto.key': job.key })) { await AvatarCleanup.deleteOne({ _id: job._id }); continue; }
            if (await cleanupAvatar(job.key, store)) removed++;
        }
        console.log(`Avatar cleanup: ${removed} objects removed; failed jobs remain for retry.`);
    } catch { console.error('Avatar cleanup unavailable. Check storage/database configuration; details suppressed.'); process.exitCode = 1; }
    finally { await mongoose.disconnect(); }
})();
