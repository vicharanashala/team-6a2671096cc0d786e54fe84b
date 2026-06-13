import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listSources, createSource, updateSource, deleteSource, testSource,
  startAnalyze, getAnalyzeStatus, listRuns,
  listSuggestions, getSuggestion, deleteSuggestion, reviewSuggestion,
  exportSuggestionsCsv
} from '../controllers/discourse.controller.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get   ('/sources',                 listSources);
router.post  ('/sources',                 createSource);
router.patch ('/sources/:id',             updateSource);
router.delete('/sources/:id',             deleteSource);
router.post  ('/sources/:id/test',        testSource);
router.post  ('/sources/:id/analyze',     startAnalyze);
router.get   ('/jobs/:request_id',        getAnalyzeStatus);
router.get   ('/runs',                    listRuns);

router.get   ('/suggestions',             listSuggestions);
router.get   ('/suggestions/:id',         getSuggestion);
router.patch ('/suggestions/:id/review',  reviewSuggestion);
router.delete('/suggestions/:id',         deleteSuggestion);
router.get   ('/suggestions-export/csv',  exportSuggestionsCsv);

export default router;
