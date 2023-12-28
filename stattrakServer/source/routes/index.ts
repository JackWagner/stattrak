import express from 'express';
import example from './example';
import flashes from './flashes';
const router = express.Router();

router.use('/example', example)
router.use('/flashes', flashes)

export default router;