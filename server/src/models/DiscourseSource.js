import mongoose from 'mongoose';

const discourseSourceSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  base_url:       { type: String, required: true, trim: true },
  api_key:        { type: String, default: '' },
  api_username:   { type: String, default: '' },
  channel:        { type: String, required: true },
  channel_type:   { type: String, enum: ['category'], default: 'category' },
  is_active:      { type: Boolean, default: true },
  last_synced_at: { type: Date, default: null },
  created_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at:     { type: Date, default: Date.now }
});

export default mongoose.model('DiscourseSource', discourseSourceSchema);
