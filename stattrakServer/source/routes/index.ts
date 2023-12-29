import express from 'express';
import kills from './kills';
import flashes from './flashes';
import leaderboard from './leaderboard';
const router = express.Router();

router.use('/kills', kills);
router.use('/flashes', flashes);
router.use('/leaderboard', leaderboard);

export default router;