import express from 'express';
import controller from '../controllers/leaderboard';

const router = express.Router();

router.get('/getLeaderBoard', controller.getLeaderBoard);

export = router;