const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { updateProfileSchema } = require('../validators/profileValidation');
const { getProfile, updateProfile } = require('../controllers/profileController');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { uploadPhoto, removePhoto } = require('../controllers/profilePhotoController');
const { MAX_PHOTO_BYTES, PHOTO_TYPES } = require('../services/avatarImages');
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth, requireRole('student'));
router.get('/profile', getProfile);
router.patch('/profile', validate(updateProfileSchema), updateProfile);
const photoLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many photo changes. Please try again later.' } });
router.post('/profile/photo', photoLimiter, (req, res, next) => {
    if (!PHOTO_TYPES.includes(req.get('Content-Type')?.split(';')[0].trim().toLowerCase())) return res.status(415).json({ message: 'Use a JPEG, PNG or WebP photo.' });
    next();
}, express.raw({ type: PHOTO_TYPES, limit: MAX_PHOTO_BYTES }), uploadPhoto);
router.delete('/profile/photo', photoLimiter, removePhoto);
router.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Choose a photo smaller than 5 MB.' });
    next(error);
});
module.exports = router;
