const vision = require('@google-cloud/vision');
const path = require('path');
const fs = require('fs');

/**
 * Build a Vision ImageAnnotatorClient.
 * Supports two auth strategies:
 *  1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON file
 *  2. GOOGLE_VISION_KEY_JSON env var containing the raw JSON string
 */
function buildVisionClient() {
  if (process.env.GOOGLE_VISION_KEY_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_VISION_KEY_JSON);
    return new vision.ImageAnnotatorClient({ credentials });
  }

  // Resolve credentials path relative to the backend root directory
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const absolutePath = path.isAbsolute(credPath)
      ? credPath
      : path.join(__dirname, '..', credPath.replace(/^\.\//, ''));
    if (fs.existsSync(absolutePath)) {
      const credentials = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
      return new vision.ImageAnnotatorClient({ credentials });
    } else {
      console.warn('[Vision OCR] Key file not found at:', absolutePath);
    }
  }

  // Falls back to ADC (Application Default Credentials)
  return new vision.ImageAnnotatorClient();
}

/**
 * Normalise a string for fuzzy matching:
 *  – lowercase
 *  – strip punctuation / extra whitespace
 */
function normalise(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Count how many tokens from `tokens` appear in `text`.
 */
function tokenMatchScore(tokens, text) {
  const normText = normalise(text);
  const matched = tokens.filter(tok => tok.length >= 2 && normText.includes(tok));
  return tokens.length > 0 ? (matched.length / tokens.length) * 100 : 0;
}

/**
 * Extract all text from an image file using Google Cloud Vision OCR.
 * @param {string} imagePath  Absolute path to the image file on disk
 * @returns {string}          Full extracted text (empty string on failure)
 */
async function extractTextFromImage(imagePath) {
  const client = buildVisionClient();
  const [result] = await client.textDetection(imagePath);
  const detections = result.textAnnotations;
  if (!detections || detections.length === 0) return '';
  return detections[0].description || '';
}

/**
 * Verify a student ID image by running OCR and comparing the extracted text
 * with the user-supplied name and ID number.
 *
 * @param {string} imagePath   Absolute path to the uploaded image
 * @param {string} studentId   The student ID number the user typed in
 * @param {string} name        The user's registered full name
 * @returns {{ extractedText, confidence, status }}
 *   status: 'auto_verified' | 'auto_failed' | 'pending_manual'
 */
async function verifyStudentId(imagePath, studentId, name) {
  let extractedText = '';
  try {
    extractedText = await extractTextFromImage(imagePath);
  } catch (err) {
    console.error('[Vision OCR] Error calling API:', err.message);
    return {
      extractedText: '',
      confidence: 0,
      status: 'pending_manual',
      error: err.message
    };
  }

  if (!extractedText) {
    return { extractedText: '', confidence: 0, status: 'pending_manual' };
  }

  const normText = normalise(extractedText);

  // --- ID number match (exact substring) ---
  const idPresent = normText.includes(normalise(studentId));

  // --- Name match (token-based, handles partial matches) ---
  const nameTokens = normalise(name).split(' ');
  const nameScore = tokenMatchScore(nameTokens, extractedText);

  // Final confidence: 50% weight each
  const idScore    = idPresent ? 100 : 0;
  const confidence = Math.round((idScore * 0.5) + (nameScore * 0.5));

  let status;
  if (confidence >= 60) {
    status = 'auto_verified';
  } else if (confidence >= 30) {
    status = 'pending_manual'; // partial match — let admin decide
  } else {
    status = 'auto_failed';
  }

  console.log(`[Vision OCR] ID match: ${idPresent}, Name score: ${nameScore.toFixed(1)}%, Confidence: ${confidence}% → ${status}`);

  return { extractedText, confidence, status };
}

module.exports = { verifyStudentId, extractTextFromImage };
