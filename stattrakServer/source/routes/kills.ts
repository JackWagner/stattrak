import express from 'express';
import controller from '../controllers/kills';

const router = express.Router();

router.get('/killsPerPlayer', controller.killsPerPlayer);

export = router;