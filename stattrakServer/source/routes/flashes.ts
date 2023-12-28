import express from 'express';
import controller from '../controllers/flashes';

const router = express.Router();

router.get('/teamFlashes', controller.teamFlashes);
router.get('/cleanFlashes', controller.cleanFlashes);

export = router;