import mongoose from 'mongoose';

const discourseAnalyzeJobSchema = new mongoose.Schema({
  source_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'DiscourseSource', required: true },
  range:          { type: String, required: true },
  from:           { type: Date },
  to:             { type: Date },
  status:         { type: String, enum: ['running', 'done', 'error'], default: 'running' },
  step:           { type: String, default: 'queued' }, // queued | fetching | clustering | saving | done
  progress:       { type: Number, default: 0 },        // 0..1 best-effort
  started_at:     { type: Date, default: Date.now },
  finished_at:    { type: Date },
  error:          { type: String },
  suggestion_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DiscourseSuggestion' }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

discourseAnalyzeJobSchema.index({ source_id: 1, started_at: -1 });
discourseAnalyzeJobSchema.index({ status: 1, started_at: -1 });

export default mongoose.model('DiscourseAnalyzeJob', discourseAnalyzeJobSchema);
