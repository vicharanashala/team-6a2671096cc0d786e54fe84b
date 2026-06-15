import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'faq_created',
      'faq_approved',
      'faq_published',
      'faq_rejected',
      'faq_deleted',
      'question_submitted',
      'question_grouped',
      'question_rejected',
      'user_registered',
      'user_login',
      'ai_suggestion',
      'discourse_faq_suggested',
      'discourse_source_added'
    ],
    required: true
  },
  description: { type: String, required: true },
  entity_type: { type: String, enum: ['FAQ', 'Question', 'User', 'DiscourseSource', 'DiscourseSuggestion'] },
  entity_id: { type: mongoose.Schema.Types.ObjectId },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_email: String,
  user_name: String,
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  is_ai_generated: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

activitySchema.index({ created_at: -1 });
activitySchema.index({ type: 1 });

export default mongoose.model('Activity', activitySchema);