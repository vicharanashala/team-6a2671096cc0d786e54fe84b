import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true },
  category: { type: String, default: 'general' },
  status: {
    type: String,
    enum: ['suggested', 'draft', 'approved', 'published', 'rejected'],
    default: 'draft'
  },
  source_questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  views: { type: Number, default: 0 },
  ratings_count: { type: Number, default: 0 },
  ratings_sum: { type: Number, default: 0 },
  average_rating: { type: Number, default: 0 },
  needs_review: { type: Boolean, default: false },
  is_ai_generated: { type: Boolean, default: false },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

faqSchema.index({ status: 1, category: 1 });
faqSchema.index({ created_by: 1 });

export default mongoose.model('FAQ', faqSchema);