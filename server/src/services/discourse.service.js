import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const SIMILARITY_THRESHOLD = parseFloat(process.env.DISCOURSE_SIMILARITY_THRESHOLD || '0.15');
const MAX_TOPICS = parseInt(process.env.DISCOURSE_MAX_TOPICS || '15', 10);
const MAX_POSTS_PER_TOPIC = parseInt(process.env.DISCOURSE_MAX_POSTS_PER_TOPIC || '3', 10);
const PROMPT_EXCERPT_CHARS = parseInt(process.env.DISCOURSE_PROMPT_EXCERPT_CHARS || '200', 10);
const TOPIC_FETCH_CONCURRENCY = parseInt(process.env.DISCOURSE_TOPIC_CONCURRENCY || '6', 10);

// Promise.all with bounded concurrency — runs up to `limit` async workers over `items`.
async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await mapper(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// HTTP — talks to Discourse. Same code path whether or not an API key is set.
// When api_key is present, we append it as query params (Discourse supports
// this on every public endpoint). When absent, we hit the endpoint anonymously
// and Discourse serves public categories without auth.
// ---------------------------------------------------------------------------
function buildUrl(base, path) {
  let url;
  try {
    url = new URL(path, base);
  } catch (e) {
    throw new Error(`Invalid base URL: ${base}`);
  }
  url.searchParams.set('api_key', '');  // placeholder, removed if blank
  // Note: we'll set the actual values below; the placeholder just documents intent
  return url;
}

function buildUrlWithAuth(base, path, { api_key, api_username } = {}) {
  const url = buildUrl(base, path);
  // remove the empty placeholder we set in buildUrl
  url.searchParams.delete('api_key');
  if (api_key) {
    url.searchParams.set('api_key', api_key);
    if (api_username) url.searchParams.set('api_username', api_username);
  }
  return url.toString();
}

async function discourseFetch(url, { api_key, api_username, timeoutMs = 15000 } = {}) {
  const fullUrl = buildUrlWithAuth(url, '', { api_key, api_username });
  const res = await fetch(fullUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) {
    const err = new Error(
      res.status === 404 ? 'Discourse returned 404 — check the category slug / topic id'
      : res.status === 401 ? 'Discourse rejected the API key (401 Unauthorized)'
      : res.status === 403 ? 'Discourse denied access (403 Forbidden) — check key or category privacy'
      : res.status === 429 ? 'Discourse rate-limited us (429) — wait 60s and retry'
      : `Discourse returned HTTP ${res.status}`
    );
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Fetch discussions for a source/channel within a date range.
// v1 supports channel_type='category' only.
//   1) GET {base}/c/{slug}.json   -> lists topics in the category
//   2) GET {base}/t/{id}.json     -> full topic incl. first 5 posts
// ---------------------------------------------------------------------------
export async function fetchDiscussions(source, { from, to } = {}) {
  const { base_url, api_key, api_username, channel, channel_type } = source;
  if (channel_type !== 'category') {
    throw new Error(`Unsupported channel_type: ${channel_type}`);
  }
  if (!channel) throw new Error('Channel slug is required');

  // Step 1: list topics in the category
  const listJson = await discourseFetch(`${base_url.replace(/\/+$/, '')}/c/${channel}.json`, { api_key, api_username });
  const topics = (listJson?.topic_list?.topics || []).slice(0, MAX_TOPICS);

  // Step 2: pull first N posts for each topic, in parallel with bounded concurrency
  const fetchTopic = async (t) => {
    try {
      const tJson = await discourseFetch(`${base_url.replace(/\/+$/, '')}/t/${t.id}.json`, { api_key, api_username, timeoutMs: 5000 });
      const stream = tJson?.post_stream?.posts || [];
      const first = stream.slice(0, MAX_POSTS_PER_TOPIC);
      const out = [];
      for (const p of first) {
        out.push({
          topic_id: t.id,
          topic_title: t.title || t.fancy_title || '',
          topic_slug: t.slug || '',
          post_id: p.id,
          post_number: p.post_number,
          url: `${base_url.replace(/\/+$/, '')}/t/${t.slug || t.id}/${t.id}/${p.post_number}`,
          excerpt: stripHtml(p.cooked || '').slice(0, 600),
          created_at: p.created_at
        });
      }
      return out;
    } catch (e) {
      return []; // skip individual topic failures
    }
  };

  const posts = (await mapWithConcurrency(topics, TOPIC_FETCH_CONCURRENCY, fetchTopic)).flat();

  // Filter by date range
  let filtered = posts;
  if (from || to) {
    const fromMs = from ? new Date(from).getTime() : -Infinity;
    const toMs = to ? new Date(to).getTime() : Infinity;
    filtered = posts.filter(p => {
      const ts = p.created_at ? new Date(p.created_at).getTime() : 0;
      return ts >= fromMs && ts <= toMs;
    });
  }

  return {
    topics_seen: topics.length,
    posts: filtered,
    sample: filtered.slice(0, 3)
  };
}

// ---------------------------------------------------------------------------
// Cluster posts + draft FAQs via Gemini (one call).
// Returns a strict JSON array. We strip markdown fences defensively.
// ---------------------------------------------------------------------------
export async function clusterAndDraft(posts, existingCategories) {
  if (posts.length === 0) return [];

  // Compact the payload: id|topic_id|title|excerpt. Excerpts are trimmed further
  // here to keep Gemini's input tokens small.
  const lines = posts.map((p, idx) => {
    const safe = (s, n) => (s || '').replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, n);
    return `${idx}|${p.topic_id}|${safe(p.topic_title, 120)}|${safe(p.excerpt, PROMPT_EXCERPT_CHARS)}`;
  });

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  });

  const prompt = `You are analyzing Discourse forum posts to surface FAQ candidates.

Existing categories (pick the closest one, or "general"):
${JSON.stringify(existingCategories)}

Rules:
- Cluster posts that ask the same underlying question. A cluster needs >= 3 posts.
- The answer must be GROUNDED in the discussion content provided. Do not invent facts.
- If the discussions do not support a confident answer, return an empty array.

For each cluster, output an object with:
  question       (string, concise FAQ title)
  answer         (string, 2-4 sentences grounded in the posts)
  category       (string, from the list above, or "general")
  references     (array of topic_id numbers)
  cluster_size   (integer, how many posts in the cluster)

Return a STRICT JSON array, no prose, no markdown fences.

Posts (id|topic_id|title|excerpt):
${lines.join('\n')}`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    // attempt to extract the first JSON array in the text
    const m = text.match(/\[[\s\S]*\]/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch { parsed = []; }
    } else {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) parsed = [];
  // Normalize fields
  return parsed
    .filter(item => item && item.question && item.answer && Array.isArray(item.references) && item.references.length > 0)
    .map(item => ({
      question: String(item.question).slice(0, 280),
      answer: String(item.answer).slice(0, 2000),
      category: existingCategories.includes(item.category) ? item.category : 'general',
      references: item.references.map(Number).filter(Boolean),
      cluster_size: item.cluster_size || item.references.length
    }));
}

// ---------------------------------------------------------------------------
// Trigram Jaccard similarity (no external deps).
// ---------------------------------------------------------------------------
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return stripHtml(text).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
}

function trigrams(text) {
  const tokens = tokenize(text);
  if (tokens.length < 3) return new Set(tokens);
  const out = new Set();
  for (let i = 0; i <= tokens.length - 3; i++) {
    out.add(tokens.slice(i, i + 3).join(' '));
  }
  return out;
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function findSimilarFaqs(questionText, faqCorpus, limit = 3) {
  const qTri = trigrams(questionText);
  const scored = faqCorpus
    .map(faq => ({ faq, score: jaccard(qTri, trigrams(faq.question || '')) }))
    .filter(x => x.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map(x => x.faq);
}

export default { fetchDiscussions, clusterAndDraft, findSimilarFaqs };
