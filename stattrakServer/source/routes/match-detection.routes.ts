/**
 * Match Detection Routes
 * ======================
 * API routes for unified match detection across platforms.
 */

import { Router } from 'express';
import { matchDetectionController } from '../controllers/match-detection.controller';

const router = Router();

// GET /api/match-detection/sources - Get status of all match detection sources
router.get(
  '/sources',
  matchDetectionController.getSourceSummary.bind(matchDetectionController)
);

// POST /api/match-detection/poll - Poll all sources for new matches
router.post(
  '/poll',
  matchDetectionController.pollSources.bind(matchDetectionController)
);

// POST /api/match-detection/download - Download a demo for a detected match
router.post(
  '/download',
  matchDetectionController.downloadMatch.bind(matchDetectionController)
);

export default router;
