const User = require('../models/User');
const publicUser = require('../utils/publicUser');

const getProfile = (req, res) => res.status(200).json({ user: publicUser(req.user), photoUpload: require('./profilePhotoController').photoSettings() });

async function updateProfile(req, res, next) {
    try {
        const { version, name } = req.body;
        const fields = {};
        if (name !== undefined) fields.name = name;
        for (const key of ['studentId', 'department', 'studyStage', 'contactNumber']) {
            if (req.body[key] !== undefined) fields[`studentProfile.${key}`] = req.body[key];
        }
        const filter = { _id: req.user._id, role: 'student', ...(version === 0 ? { $or: [{ profileVersion: 0 }, { profileVersion: { $exists: false } }] } : { profileVersion: version }) };
        const user = await User.findOneAndUpdate(filter, { $set: fields, $inc: { profileVersion: 1 } }, { returnDocument: 'after', runValidators: true })
            .select('_id name email role createdAt studentProfile profileVersion profilePhoto');
        if (!user) return res.status(409).json({ message: 'Your saved profile changed. Review the latest version before saving again.' });
        return res.status(200).json({ message: 'Profile saved', user: publicUser(user) });
    } catch (error) { next(error); }
}
module.exports = { getProfile, updateProfile };
