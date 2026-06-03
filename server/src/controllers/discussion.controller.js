import Discussion from '../models/Discussion.js';
import Reply from '../models/Reply.js';
import User from '../models/User.js';
import FAQ from '../models/FAQ.js';

// Create a new discussion
export const createDiscussion = async (req, res) => {
  try {
    const { title, text, category } = req.body;
    if (!title || !text) return res.status(400).json({ error: 'Title and text are required.' });

    const discussion = new Discussion({
      title,
      text,
      category: category || 'general',
      author: req.user._id
    });

    await discussion.save();
    res.status(201).json(discussion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// List discussions with pagination
export const listDiscussions = async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const filter = {};
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const discussions = await Discussion.find(filter)
      .populate('author', 'username email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Discussion.countDocuments(filter);
    res.json({ discussions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a discussion with its replies
export const getDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const discussion = await Discussion.findById(id).populate('author', 'username email');
    if (!discussion) return res.status(404).json({ error: 'Discussion not found.' });

    const replies = await Reply.find({ discussion: id })
      .populate('author', 'username email')
      .sort({ created_at: 1 });

    res.json({ discussion, replies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Post a reply to a discussion (or as a child reply)
export const createReply = async (req, res) => {
  try {
    const { id } = req.params; // discussion id
    const { parentId, text } = req.body;
    if (!text) return res.status(400).json({ error: 'Reply text is required.' });

    const discussion = await Discussion.findById(id);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found.' });

    const reply = new Reply({
      discussion: id,
      parent: parentId || null,
      author: req.user._id,
      text
    });

    await reply.save();

    discussion.replies_count = (discussion.replies_count || 0) + 1;
    await discussion.save();

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Vote on a reply: body { vote: 1 | -1 }
export const voteReply = async (req, res) => {
  try {
    const { id } = req.params; // reply id
    const { vote } = req.body;
    if (![1, -1].includes(vote)) return res.status(400).json({ error: 'Vote must be 1 or -1.' });

    const reply = await Reply.findById(id);
    if (!reply) return res.status(404).json({ error: 'Reply not found.' });

    const userId = req.user._id.toString();
    const hasUp = reply.upvotes.map(String).includes(userId);
    const hasDown = reply.downvotes.map(String).includes(userId);

    if (vote === 1) {
      if (hasUp) {
        reply.upvotes = reply.upvotes.filter(u => u.toString() !== userId);
      } else {
        if (hasDown) {
          reply.downvotes = reply.downvotes.filter(u => u.toString() !== userId);
        }
        reply.upvotes.push(req.user._id);
      }
    } else {
      if (hasDown) {
        reply.downvotes = reply.downvotes.filter(u => u.toString() !== userId);
      } else {
        if (hasUp) {
          reply.upvotes = reply.upvotes.filter(u => u.toString() !== userId);
        }
        reply.downvotes.push(req.user._id);
      }
    }

    // moderation logic
    const upvoteThreshold = parseInt(process.env.FAQ_CANDIDATE_THRESHOLD) || 10;
    const downvoteThreshold = parseInt(process.env.FLAG_THRESHOLD) || 5;
    
    reply.isFaqCandidate = reply.upvotes.length >= upvoteThreshold;
    reply.isFlagged = reply.downvotes.length >= downvoteThreshold;

    await reply.save();

    res.json({ 
      message: 'Vote recorded.',
      upvotes: reply.upvotes.length,
      downvotes: reply.downvotes.length,
      isFaqCandidate: reply.isFaqCandidate,
      isFlagged: reply.isFlagged
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a discussion and all its replies
export const deleteDiscussion = async (req, res) => {
  try {
    const { id } = req.params;
    const discussion = await Discussion.findById(id);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found.' });

    if (req.user.role !== 'ADMIN' && req.user._id.toString() !== discussion.author.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this discussion.' });
    }

    await Discussion.findByIdAndDelete(id);
    await Reply.deleteMany({ discussion: id });

    res.json({ message: 'Discussion deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a single reply
export const deleteReply = async (req, res) => {
  try {
    const { id } = req.params;
    const reply = await Reply.findById(id);
    if (!reply) return res.status(404).json({ error: 'Reply not found.' });

    if (req.user.role !== 'ADMIN' && req.user._id.toString() !== reply.author.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this reply.' });
    }

    await Reply.findByIdAndDelete(id);
    await Discussion.findByIdAndUpdate(reply.discussion, { $inc: { replies_count: -1 } });

    res.json({ message: 'Reply deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getModerationItems = async (req, res) => {
  try {
    const flagged = await Reply.find({ isFlagged: true })
      .populate('author', 'username email')
      .populate('discussion', 'title category')
      .sort({ downvotes: -1 });
      
    const candidates = await Reply.find({ isFaqCandidate: true })
      .populate('author', 'username email')
      .populate('discussion', 'title category')
      .sort({ upvotes: -1 });

    res.json({ flagged, candidates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const dismissFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const reply = await Reply.findById(id);
    if (!reply) return res.status(404).json({ error: 'Reply not found.' });

    reply.isFlagged = false;
    reply.downvotes = [];
    await reply.save();

    res.json({ message: 'Flag dismissed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const promoteToFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const reply = await Reply.findById(id).populate('discussion', 'title category');
    if (!reply) return res.status(404).json({ error: 'Reply not found.' });

    const faq = new FAQ({
      question: reply.discussion.title,
      answer: reply.text,
      category: reply.discussion.category,
      status: 'draft',
      created_by: req.user._id
    });
    await faq.save();

    reply.isFaqCandidate = false; // Reset candidate status
    await reply.save();
    
    await Discussion.findByIdAndUpdate(reply.discussion._id, { 
      promoted_to_faq: true,
      promoted_faq_id: faq._id
    });

    res.json({ message: 'Promoted to FAQ as draft.', faq });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

