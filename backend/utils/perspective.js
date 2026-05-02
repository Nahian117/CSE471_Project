const axios = require('axios');

const PERSPECTIVE_API_KEY = process.env.PERSPECTIVE_API_KEY;
const API_URL = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${PERSPECTIVE_API_KEY}`;

/**
 * Analyse text using the Perspective API.
 *
 * @param {string} text  The text to analyse
 * @returns {Promise<{ toxicityScore: number, spamScore: number, raw: object }>}
 */
async function analyseText(text) {
  if (!PERSPECTIVE_API_KEY) {
    console.warn('[Perspective] API key not set — skipping analysis.');
    return { toxicityScore: 0, spamScore: 0, raw: null };
  }

  if (!text || text.trim().length < 3) {
    return { toxicityScore: 0, spamScore: 0, raw: null };
  }

  try {
    const body = {
      comment:            { text: text.trim() },
      languages:          ['en'],
      requestedAttributes: {
        TOXICITY:              {},
        SEVERE_TOXICITY:       {},
        SPAM:                  {},
        INSULT:                {},
        THREAT:                {},
        IDENTITY_ATTACK:       {},
      }
    };

    const { data } = await axios.post(API_URL, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });

    const scores = data.attributeScores || {};
    const get = (attr) => scores[attr]?.summaryScore?.value ?? 0;

    const toxicityScore = get('TOXICITY');
    const spamScore     = get('SPAM');

    console.log(`[Perspective] toxicity=${toxicityScore.toFixed(3)} spam=${spamScore.toFixed(3)}`);

    return {
      toxicityScore,
      spamScore,
      severeToxicity:  get('SEVERE_TOXICITY'),
      insult:          get('INSULT'),
      threat:          get('THREAT'),
      identityAttack:  get('IDENTITY_ATTACK'),
      raw: data
    };
  } catch (err) {
    if (err.response) {
      console.error('[Perspective] API error:', err.response.status, JSON.stringify(err.response.data));
    } else {
      console.error('[Perspective] Request failed:', err.message);
    }
    // Return neutral scores so the report still gets saved
    return { toxicityScore: 0, spamScore: 0, raw: null, error: err.message };
  }
}

/**
 * Classify a report based on toxicity and spam scores.
 *
 * Thresholds:
 *   toxicity > 0.75  → 'spam'       (abusive / toxic — auto-reject)
 *   toxicity > 0.45  → 'suspicious' (borderline — send to admin with flag)
 *   otherwise        → 'valid'      (normal report — queue for admin review)
 *
 * @param {number} toxicityScore  0-1
 * @param {number} spamScore      0-1
 * @returns {'valid'|'suspicious'|'spam'}
 */
function classifyReport(toxicityScore, spamScore) {
  if (toxicityScore > 0.75 || spamScore > 0.80) return 'spam';
  if (toxicityScore > 0.45 || spamScore > 0.55) return 'suspicious';
  return 'valid';
}

module.exports = { analyseText, classifyReport };
