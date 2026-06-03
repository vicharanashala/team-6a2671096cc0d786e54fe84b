import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  createDiscussion,
  listDiscussions,
  getDiscussion,
  createReply,
  voteReply,
  deleteDiscussion,
  deleteReply,
  getModerationItems,
  dismissFlag,
  promoteToFAQ
} from '../controllers/discussion.controller.js';

const router = Router();

router.post('/', authenticate, createDiscussion);
router.get('/', authenticate, listDiscussions);
router.get('/moderation', authenticate, requireAdmin, getModerationItems);
router.get('/:id', authenticate, getDiscussion);
router.post('/:id/replies', authenticate, createReply);
router.post('/replies/:id/vote', authenticate, voteReply);
router.delete('/:id', authenticate, deleteDiscussion);
router.delete('/replies/:id', authenticate, deleteReply);
router.post('/replies/:id/promote', authenticate, requireAdmin, promoteToFAQ);
router.post('/replies/:id/dismiss-flag', authenticate, requireAdmin, dismissFlag);

export default router;
