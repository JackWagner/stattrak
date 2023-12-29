import express from 'express';
import controller from '../controllers/flashes';

const router = express.Router();

router.get('/teamFlashes', controller.getLeaderBoard);

export = router;