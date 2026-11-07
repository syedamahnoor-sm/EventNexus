const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { getDashboard } = require('../controllers/organizerController');
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/dashboard', requireAuth, requireRole('organizer'), getDashboard);
module.exports = router;
