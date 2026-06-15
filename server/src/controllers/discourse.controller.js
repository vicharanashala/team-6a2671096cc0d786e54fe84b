import DiscourseSource from '../models/DiscourseSource.js';
import DiscourseSuggestion from '../models/DiscourseSuggestion.js';
import DiscourseAnalyzeJob from '../models/DiscourseAnalyzeJob.js';
import FAQ from '../models/FAQ.js';
import Activity from '../models/Activity.js';
import mongoose from 'mongoose';
import { fetchDiscussions, clusterAndDraft, findSimilarFaqs } from '../services/discourse.service.js';

const CACHE_MINUTES = parseInt(process.env.DISCOURSE_ANALYZE_CACHE_MINUTES || '5', 10);
const MAX_RANGE_DAYS = 365;

const parseRange = (range) => {
  const now = new Date();
  if (!range) {
    return { from: new Date(now - 30 * 24 * 60 * 60 * 1000), to: now };
  }
  if (typeof range === 'string') {
    if (range === 'custom') {
      // 'custom' is a UI signal — the actual dates must be provided separately.
      // The client always sends { from, to } when range === 'custom', so this
      // branch should not be reached in normal use. Throw a clear 400 if it is.
      throw new Error("range 'custom' requires explicit { from, to } dates");
    }
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
    if (days) {
      return { from: new Date(now - days * 24 * 60 * 60 * 1000), to: now };
    }
    throw new Error(`Invalid range preset: '${range}'. Use '7d' | '30d' | '90d' or { from, to }`);
  }
  if (typeof range === 'object' && range.from && range.to) {
    const from = new Date(range.from);
    const to = new Date(range.to);
    if (isNaN(from.getTime())) throw new Error('Invalid from date');
    if (isNaN(to.getTime())) throw new Error('Invalid to date');
    return { from, to };
  }
  throw new Error('range must be a preset string or { from, to } object');
};

const validateRange = (from, to) => {
  if (from && to && (to - from) / (1000 * 60 * 60 * 24) > MAX_RANGE_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
  }
  if (from && to && to < from) throw new Error('Date range "to" must be after "from"');
};

const logActivity = async (type, description, entity_type, entity_id, req, metadata = {}, is_ai_generated = false) => {
  try {
    await new Activity({
      type, description, entity_type, entity_id,
      user_id: req.user?._id, user_email: req.user?.email, user_name: req.user?.username,
      metadata, is_ai_generated
    }).save();
  } catch (e) {
    console.error('Activity log failed:', e.message);
  }
};

// ---------------------------------------------------------------------------
// Sources CRUD
// ---------------------------------------------------------------------------

// Strip the API key from the response. Return a masked value + a boolean
// so the admin UI can show "configured" without exposing the secret.
const sanitizeSource = (s) => {
  const obj = typeof s.toObject === 'function' ? s.toObject() : s;
  const { api_key, ...rest } = obj;
  return {
    ...rest,
    api_key: api_key ? '••••' + api_key.slice(-4) : '',
    has_api_key: !!api_key
  };
};

export const listSources = async (req, res) => {
  try {
    const sources = await DiscourseSource.find().sort({ created_at: -1 });
    res.json(sources.map(sanitizeSource));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const createSource = async (req, res) => {
  try {
    const { name, base_url, api_key, api_username, channel, channel_type, is_active } = req.body;
    if (!name || !base_url || !channel) {
      return res.status(400).json({ error: 'name, base_url, and channel are required.' });
    }
    if (!/^https?:\/\//i.test(base_url)) {
      return res.status(400).json({ error: 'base_url must start with http:// or https://' });
    }
    const source = new DiscourseSource({
      name, base_url, api_key: api_key || '', api_username: api_username || '',
      channel, channel_type: 'category', is_active: is_active !== false,
      created_by: req.user._id
    });
    await source.save();
    await logActivity('discourse_source_added', `Discourse source added: ${name}`, 'DiscourseSource', source._id, req, { channel });
    res.status(201).json(sanitizeSource(source));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const updateSource = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.body.base_url !== undefined && !/^https?:\/\//i.test(req.body.base_url)) {
      return res.status(400).json({ error: 'base_url must start with http:// or https://' });
    }
    const updates = { ...req.body };
    delete updates._id;
    // api_key is intentionally not patchable — a blank string from the form
    // would otherwise wipe the stored credential. To rotate the key, re-create
    // the source.
    delete updates.api_key;
    const source = await DiscourseSource.findByIdAndUpdate(id, updates, { new: true });
    if (!source) return res.status(404).json({ error: 'Source not found.' });
    res.json(sanitizeSource(source));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const deleteSource = async (req, res) => {
  try {
    const { id } = req.params;
    const source = await DiscourseSource.findByIdAndDelete(id);
    if (!source) return res.status(404).json({ error: 'Source not found.' });
    // also delete its suggestions and jobs
    await DiscourseSuggestion.deleteMany({ source_id: id });
    await DiscourseAnalyzeJob.deleteMany({ source_id: id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const testSource = async (req, res) => {
  try {
    const { id } = req.params;
    const source = await DiscourseSource.findById(id);
    if (!source) return res.status(404).json({ error: 'Source not found.' });
    const { from, to } = parseRange('7d');
    validateRange(from, to);
    const result = await fetchDiscussions(source, { from, to });
    source.last_synced_at = new Date();
    await source.save();
    res.json({ ok: true, count: result.posts.length, topics_seen: result.topics_seen, sample: result.sample });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ---------------------------------------------------------------------------
// Analyze — start a job, return request_id immediately, run in background.
// ---------------------------------------------------------------------------
const runAnalyzeJob = async (job, source, { from, to } = {}) => {
  const updateProgress = async (step, progress) => {
    try { job.step = step; job.progress = progress; await job.save(); }
    catch (e) { /* non-fatal */ }
  };
  try {
    // 1) fetch discussions
    await updateProgress('fetching', 0.1);
    const { posts } = await fetchDiscussions(source, { from, to });
    await updateProgress('clustering', 0.6);

    // 2) gather existing categories (admin-defined)
    const existingCategories = await FAQ.distinct('category');

    // 3) build corpus for similarity
    const faqCorpus = await FAQ.find({}, 'question _id').lean();

    // 4) cluster + draft
    const clusters = posts.length === 0 ? [] : await clusterAndDraft(posts, existingCategories);
    await updateProgress('saving', 0.9);

    // 5) attach similar_faq_ids per cluster
    const createdIds = [];
    for (const c of clusters) {
      const similar = findSimilarFaqs(c.question, faqCorpus, 3);
      const refs = c.references.map(topic_id => {
        const p = posts.find(pp => pp.topic_id === Number(topic_id));
        return p ? {
          topic_id: p.topic_id,
          post_id: p.post_id,
          topic_title: p.topic_title,
          topic_slug: p.topic_slug,
          url: p.url,
          excerpt: p.excerpt
        } : { topic_id: Number(topic_id) };
      });
      const sugg = new DiscourseSuggestion({
        source_id: job.source_id,
        run_id: job._id,
        question: c.question,
        answer: c.answer,
        category: c.category,
        references: refs,
        cluster_size: c.cluster_size,
        similar_faq_ids: similar.map(s => s._id),
        status: 'pending',
        raw_clusters: { matched_post_count: refs.length }
      });
      await sugg.save();
      createdIds.push(sugg._id);
    }

    job.status = 'done';
    job.step = 'done';
    job.progress = 1;
    job.finished_at = new Date();
    job.suggestion_ids = createdIds;
    await job.save();

    if (source) {
      source.last_synced_at = new Date();
      await source.save();
    }
  } catch (e) {
    job.status = 'error';
    job.finished_at = new Date();
    job.error = e.message;
    await job.save();
  }
};

export const startAnalyze = async (req, res) => {
  try {
    const { id } = req.params;
    const { range, force } = req.body;
    const source = await DiscourseSource.findById(id);
    if (!source) return res.status(404).json({ error: 'Source not found.' });

    let from, to;
    try {
      ({ from, to } = parseRange(range));
      validateRange(from, to);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // cache check (skipped if force === true)
    if (!force) {
      const cacheCutoff = new Date(Date.now() - CACHE_MINUTES * 60 * 1000);
      const cachedJob = await DiscourseAnalyzeJob.findOne({
        source_id: id, status: 'done', finished_at: { $gte: cacheCutoff }
      }).sort({ finished_at: -1 });
      if (cachedJob) {
        return res.json({ request_id: cachedJob._id, cached: true, suggestions_created: cachedJob.suggestion_ids.length });
      }
    }

    const job = new DiscourseAnalyzeJob({ source_id: id, range: typeof range === 'string' ? range : 'custom', from, to });
    await job.save();

    // fire-and-forget
    setImmediate(() => runAnalyzeJob(job, source, { from, to }));

    res.status(202).json({ request_id: job._id, cached: false });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getAnalyzeStatus = async (req, res) => {
  try {
    const { request_id } = req.params;
    const job = await DiscourseAnalyzeJob.findById(request_id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    res.json({
      status: job.status,
      step: job.step,
      progress: job.progress,
      error: job.error,
      suggestion_ids: job.suggestion_ids,
      started_at: job.started_at,
      finished_at: job.finished_at
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------
export const listSuggestions = async (req, res) => {
  try {
    const { source_id, status, run_id, since, until } = req.query;
    const filter = {};
    if (source_id) filter.source_id = source_id;
    if (status) filter.status = status;
    if (run_id) filter.run_id = run_id;
    if (since || until) {
      filter.generated_at = {};
      if (since) filter.generated_at.$gte = new Date(since);
      if (until) filter.generated_at.$lte = new Date(until);
    }
    const suggestions = await DiscourseSuggestion.find(filter)
      .populate('source_id', 'name base_url channel')
      .populate('similar_faq_ids', 'question category status')
      .populate('faq_id', 'question category status')
      .sort({ generated_at: -1 });
    res.json(suggestions);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// List distinct analyze runs (for the "filter by run" UI). Each run = one Analyze click.
export const listRuns = async (req, res) => {
  try {
    const { source_id } = req.query;
    const match = {};
    if (source_id) {
      if (!mongoose.Types.ObjectId.isValid(source_id)) {
        return res.status(400).json({ error: 'Invalid source_id' });
      }
      match.source_id = new mongoose.Types.ObjectId(source_id);
    }
    const runs = await DiscourseAnalyzeJob.aggregate([
      { $match: match },
      { $sort: { started_at: -1 } },
      { $limit: 50 },
      { $lookup: { from: 'discoursesources', localField: 'source_id', foreignField: '_id', as: 'source' } },
      { $unwind: { path: '$source', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1, source_id: 1, source_name: { $ifNull: ['$source.name', '(deleted source)'] },
          source_channel: { $ifNull: ['$source.channel', ''] },
          range: 1, started_at: 1, finished_at: 1, status: 1, suggestion_ids: 1
        }
      }
    ]);
    res.json(runs);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const sugg = await DiscourseSuggestion.findById(id)
      .populate('similar_faq_ids', 'question category status')
      .populate('faq_id', 'question category status');
    if (!sugg) return res.status(404).json({ error: 'Suggestion not found.' });
    res.json(sugg);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const deleteSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const sugg = await DiscourseSuggestion.findByIdAndDelete(id);
    if (!sugg) return res.status(404).json({ error: 'Suggestion not found.' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const reviewSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, overrides } = req.body;
    if (!['approve', 'reject', 'edit'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve | reject | edit' });
    }
    const sugg = await DiscourseSuggestion.findById(id);
    if (!sugg) return res.status(404).json({ error: 'Suggestion not found.' });
    if (sugg.status !== 'pending') {
      return res.status(400).json({ error: `Suggestion already ${sugg.status}.` });
    }

    if (action === 'reject') {
      sugg.status = 'rejected';
      sugg.reviewed_by = req.user._id;
      sugg.reviewed_at = new Date();
      await sugg.save();
      return res.json({ suggestion: sugg });
    }

    // approve or edit -> create FAQ
    const finalQ = (overrides?.question || sugg.question).slice(0, 280);
    const finalA = (overrides?.answer || sugg.answer).slice(0, 4000);
    const finalC = (overrides?.category || sugg.category || 'general').toString().slice(0, 60);

    const faq = new FAQ({
      question: finalQ,
      answer: finalA,
      category: finalC,
      status: 'draft',
      is_ai_generated: true,
      source_questions: [],
      metadata: { discourse_source_id: sugg.source_id, discourse_suggestion_id: sugg._id }
    });
    await faq.save();

    sugg.faq_id = faq._id;
    sugg.status = action === 'edit' ? 'edited' : 'approved';
    sugg.reviewed_by = req.user._id;
    sugg.reviewed_at = new Date();
    if (action === 'edit') {
      sugg.question = finalQ;
      sugg.answer = finalA;
      sugg.category = finalC;
    }
    await sugg.save();

    await logActivity(
      'faq_created',
      `New FAQ created from Discourse: ${finalQ.substring(0, 50)}...`,
      'FAQ', faq._id, req,
      { category: finalC, source: 'discourse', discourse_suggestion_id: sugg._id },
      true
    );

    res.json({ suggestion: sugg, faq });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const exportSuggestionsCsv = async (req, res) => {
  try {
    const suggestions = await DiscourseSuggestion.find().sort({ generated_at: -1 });

    // CSV escape: quote-wrap, double-up quotes, and prefix any cell that starts
    // with a character that Excel/Sheets would interpret as a formula (=, +, -, @,
    // tab, CR) with a single quote. This is the standard CSV-injection mitigation.
    const csvEscape = (val) => {
      if (val == null) return '';
      let s = String(val);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };

    const csv = [
      ['Question', 'Answer', 'Category', 'Status', 'ClusterSize', 'ReferencesCount', 'GeneratedAt'].join(','),
      ...suggestions.map(s => [
        csvEscape(s.question),
        csvEscape(s.answer),
        csvEscape(s.category || 'general'),
        csvEscape(s.status),
        s.cluster_size || 0,
        (s.references || []).length,
        new Date(s.generated_at).toISOString()
      ].join(','))
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=discourse_suggestions_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
