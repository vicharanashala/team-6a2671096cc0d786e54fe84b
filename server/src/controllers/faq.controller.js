import FAQ from '../models/FAQ.js';
import Question from '../models/Question.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../services/email.service.js';

const logActivity = async (type, description, entityType, entityId, userId, userEmail, userName, metadata = {}, isAiGenerated = false) => {
  try {
    const activity = new Activity({
      type,
      description,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      metadata,
      is_ai_generated: isAiGenerated
    });
    await activity.save();
  } catch (error) {
    console.error('Activity logging failed:', error.message);
  }
};

export const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, source_questions, is_ai_generated } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required.' });
    }

    const faq = new FAQ({
      question,
      answer,
      category: category || 'general',
      source_questions: source_questions || [],
      status: 'draft',
      is_ai_generated: is_ai_generated || false,
      created_by: req.user?._id
    });

    await faq.save();

    if (source_questions && source_questions.length > 0) {
      await Question.updateMany(
        { _id: { $in: source_questions } },
        { status: 'converted_to_faq', updated_at: Date.now() }
      );
    }

    await logActivity(
      'faq_created',
      `New FAQ created: ${question.substring(0, 50)}...`,
      'FAQ',
      faq._id,
      req.user?._id,
      req.user?.email,
      req.user?.username,
      { category, source_questions_count: source_questions?.length || 0 },
      is_ai_generated
    );

    await sendEmail('faqCreated', {
      faq: { ...faq.toObject(), is_ai_generated },
      user_name: req.user?.username,
      user_email: req.user?.email,
      timestamp: new Date()
    });

    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFAQs = async (req, res) => {
  try {
    const { status, category } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (req.query.needs_review === 'true') filter.needs_review = true;

    const faqs = await FAQ.find(filter)
      .populate('source_questions', 'text')
      .populate('created_by', 'username email')
      .sort({ created_at: -1 });

    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPublishedFAQs = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'published' };
    if (category) filter.category = category;

    const faqs = await FAQ.find(filter).sort({ created_at: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findById(id)
      .populate('source_questions', 'text')
      .populate('created_by', 'username email');

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found.' });
    }

    res.json(faq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, status } = req.body;

    const updateFields = { 
      updated_at: Date.now(),
      needs_review: false,
      ratings_count: 0,
      ratings_sum: 0,
      average_rating: 0
    };
    if (question) updateFields.question = question;
    if (answer) updateFields.answer = answer;
    if (category) updateFields.category = category;
    if (status) {
      const validStatuses = ['suggested', 'draft', 'approved', 'published', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }
      updateFields.status = status;
    }

    const faq = await FAQ.findByIdAndUpdate(id, updateFields, { new: true })
      .populate('created_by', 'username email');

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found.' });
    }

    res.json(faq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateFAQStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['suggested', 'draft', 'approved', 'published', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const faq = await FAQ.findById(id).populate('created_by', 'username email');
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found.' });
    }
    
    const oldStatus = faq.status;
    faq.status = status;
    faq.updated_at = Date.now();
    await faq.save();

    if (oldStatus === 'suggested' && (status === 'draft' || status === 'approved' || status === 'published')) {
      await Question.updateMany(
        { _id: { $in: faq.source_questions } },
        { status: 'converted_to_faq', updated_at: Date.now() }
      );
    }

    let activityType, emailType;
    switch (status) {
      case 'approved':
        activityType = 'faq_approved';
        emailType = 'faqApproved';
        break;
      case 'published':
        activityType = 'faq_published';
        emailType = 'faqPublished';
        break;
      case 'rejected':
        activityType = 'faq_rejected';
        emailType = 'faqRejected';
        break;
      default:
        activityType = null;
        emailType = null;
    }

    if (activityType) {
      await logActivity(
        activityType,
        `FAQ ${status}: ${faq.question.substring(0, 50)}...`,
        'FAQ',
        faq._id,
        req.user?._id,
        req.user?.email,
        req.user?.username,
        { previous_status: faq.status }
      );

      if (emailType) {
        await sendEmail(emailType, {
          faq: { ...faq.toObject(), is_ai_generated: faq.is_ai_generated },
          user_name: req.user?.username,
          user_email: req.user?.email,
          timestamp: new Date()
        });
      }

      if (status === 'published' && faq.source_questions && faq.source_questions.length > 0) {
        const sourceQuestions = await Question.find({ _id: { $in: faq.source_questions } }).populate('submitted_by', 'username email');
        
        for (const sq of sourceQuestions) {
          if (sq.submitted_by && !sq.is_guest) {
            const user = sq.submitted_by;
            
            const notification = new Notification({
              user_id: user._id,
              email: user.email,
              type: 'faq_published',
              title: 'Your Question Is Now Live as an FAQ!',
              message: `Great news! Your question "${sq.text.substring(0, 50)}..." has been published as an FAQ and is now visible to everyone!`,
              related_question_id: sq._id,
              related_faq_id: faq._id,
              metadata: { faq_question: faq.question, faq_answer: faq.answer }
            });
            await notification.save();

            await sendEmail('faqPublishedUser', {
              user_name: user.username,
              faq: { question: faq.question, answer: faq.answer, category: faq.category, views: faq.views || 0 },
              timestamp: new Date()
            }, { to: user.email });
          }
        }
      }
    }

    res.json(faq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found.' });
    }

    await logActivity(
      'faq_deleted',
      `FAQ deleted: ${faq.question.substring(0, 50)}...`,
      'FAQ',
      faq._id,
      req.user?._id,
      req.user?.email,
      req.user?.username,
      { deleted_faq_status: faq.status }
    );

    await sendEmail('faqDeleted', {
      faq: { question: faq.question, answer: faq.answer, category: faq.category, status: faq.status },
      user_name: req.user?.username,
      user_email: req.user?.email,
      timestamp: new Date()
    });

    await Question.updateMany(
      { _id: { $in: faq.source_questions } },
      { status: 'reviewed', updated_at: Date.now() }
    );

    res.json({ message: 'FAQ deleted.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const incrementViews = async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await FAQ.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found.' });
    }

    res.json({ views: faq.views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const exportPublishedFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ status: 'published' })
      .select('question answer category views created_at')
      .sort({ views: -1 });

    const csvContent = [
      ['Question', 'Answer', 'Category', 'Views', 'Created Date'].join(','),
      ...faqs.map(faq => [
        `"${(faq.question || '').replace(/"/g, '""')}"`,
        `"${(faq.answer || '').replace(/"/g, '""')}"`,
        faq.category || 'general',
        faq.views || 0,
        new Date(faq.created_at).toISOString().split('T')[0]
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=faqs_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getActivities = async (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const activities = await Activity.find(filter)
      .populate('user_id', 'username email')
      .sort({ created_at: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(filter);

    res.json({ activities, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyFAQs = async (req, res) => {
  try {
    const faqs = await FAQ.find({ created_by: req.user._id })
      .populate('source_questions', 'text status')
      .sort({ created_at: -1 });
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

  export const submitRating = async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, oldRating } = req.body;
  
      const ratingVal = Number(rating);
      if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
        return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' });
      }
  
      const faq = await FAQ.findById(id);
      if (!faq) {
        return res.status(404).json({ error: 'FAQ not found.' });
      }
  
      if (oldRating) {
        const oldVal = Number(oldRating);
        if (!isNaN(oldVal) && oldVal >= 1 && oldVal <= 5) {
          faq.ratings_sum = (faq.ratings_sum || 0) - oldVal + ratingVal;
          // ratings_count remains the same
        }
      } else {
        faq.ratings_count = (faq.ratings_count || 0) + 1;
        faq.ratings_sum = (faq.ratings_sum || 0) + ratingVal;
      }
      
      faq.average_rating = faq.ratings_count > 0 
        ? Number((faq.ratings_sum / faq.ratings_count).toFixed(2))
        : 0;

    // Flag for review if average rating falls below 3.0 after at least 3 ratings
    if (faq.average_rating < 3.0 && faq.ratings_count >= 3) {
      faq.needs_review = true;
      
      // Log system activity for flagged FAQ
      await logActivity(
        'faq_flagged_for_review',
        `FAQ flagged for low rating (${faq.average_rating} stars): ${faq.question.substring(0, 50)}...`,
        'FAQ',
        faq._id,
        null,
        'System',
        'System',
        { average_rating: faq.average_rating, ratings_count: faq.ratings_count }
      );
    }

    await faq.save();

    res.json({
      message: 'Rating submitted successfully.',
      ratings_count: faq.ratings_count,
      average_rating: faq.average_rating,
      needs_review: faq.needs_review
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};