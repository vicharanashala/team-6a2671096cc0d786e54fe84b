import mongoose from 'mongoose';

const referenceSchema = new mongoose.Schema({
  topic_id:    { type: Number, required: true },
  post_id:     { type: Number },
  topic_title: { type: String },
  topic_slug:  { type: String },
  url:         { type: String },
  excerpt:     { type: String }
}, { _id: false });

const discourseSuggestionSchema = new mongoose.Schema({
  source_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'DiscourseSource', required: true },
  run_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'DiscourseAnalyzeJob', default: null, index: true },
  question:        { type: String, required: true },
  answer:          { type: String, required: true },
  category:        { type: String, default: 'general' },
  references:      [referenceSchema],
  cluster_size:    { type: Number, default: 0 },
  similar_faq_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FAQ' }],
  status:          { type: String, enum: ['pending', 'approved', 'rejected', 'edited'], default: 'pending' },
  faq_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'FAQ', default: null },
  generated_at:    { type: Date, default: Date.now },
  reviewed_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewed_at:     { type: Date },
  raw_clusters:    { type: mongoose.Schema.Types.Mixed, default: {} }
});

discourseSuggestionSchema.index({ source_id: 1, status: 1 });
discourseSuggestionSchema.index({ generated_at: -1 });

export default mongoose.model('DiscourseSuggestion', discourseSuggestionSchema);
