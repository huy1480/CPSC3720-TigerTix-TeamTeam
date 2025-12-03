const https = require('https');
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || '').trim();

const numberWords = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12
};

function postToGemini(prompt, model) {
  if (!GEMINI_API_KEY) {
    return Promise.reject(new Error('GEMINI_API_KEY is not configured'));
  }

  const targetModel =
    model ||
    GEMINI_MODEL ||
    'gemini-2.5-flash';

  const payload = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.9
    }
  });

  const path = `/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: 'generativelanguage.googleapis.com',
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 15000
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            return reject(new Error(`Gemini status ${response.statusCode}: ${body}`));
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error(`Bad JSON from Gemini: ${err.message}`));
          }
        });
      }
    );

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

/**
 * ✅ IMPROVED: System prompt with better examples for partial matches
 */
function buildSystemPrompt(events = []) {
  const eventList =
    events.length === 0
      ? 'No events available.'
      : events.map((event) => `"${event.name}"`).join(', ');

  return `You are a booking assistant for TigerTix. Parse user requests and respond with JSON.

Available events: ${eventList}

Valid intents (choose exactly ONE):
- greet
- show_events
- event_details
- book
- confirm
- cancel
- unknown

Response format (JSON only, no other text):
{
  "intent": "one intent from the list above",
  "eventName": "event name string or keyword from user's message",
  "tickets": 1
}

IMPORTANT: For eventName, extract ANY event-related word from the user's message. Even partial names are OK.

Examples:
User: "hello" → {"intent":"greet","eventName":null,"tickets":1}
User: "show events" → {"intent":"show_events","eventName":null,"tickets":1}
User: "book Jazz Night" → {"intent":"book","eventName":"Jazz Night","tickets":1}
User: "book 2 tickets for Spring Concert" → {"intent":"book","eventName":"Spring Concert","tickets":2}
User: "book basketball" → {"intent":"book","eventName":"basketball","tickets":1}
User: "book two tickets for basketball" → {"intent":"book","eventName":"basketball","tickets":2}
User: "I want football tickets" → {"intent":"book","eventName":"football","tickets":1}
User: "book hackathon" → {"intent":"book","eventName":"hackathon","tickets":1}
User: "yes" → {"intent":"confirm","eventName":null,"tickets":1}
User: "no" → {"intent":"cancel","eventName":null,"tickets":1}

CRITICAL: 
- intent must be ONE word from the valid intents list
- eventName should be ANY sports/event word from the user's message (like "basketball", "football", "concert", etc.)
- tickets must be a number`.trim();
}

// Prefer models listed as available for generateContent from the API listing
const MODEL_FALLBACKS = [
  () => GEMINI_MODEL && GEMINI_MODEL.trim(),
  () => 'gemini-2.5-flash',
  () => 'gemini-2.5-pro',
  () => 'gemini-flash-latest',
  () => 'gemini-pro-latest',
  () => 'gemini-2.0-flash',
  () => 'gemini-2.0-flash-001',
  () => 'gemini-2.0-flash-lite-001'
].filter(Boolean);

async function callGemini(text, events) {
  const systemPrompt = buildSystemPrompt(events);

  const prompt = `${systemPrompt}\n\nUser: ${text}\nJSON:`;
  let lastError;

  for (const getModel of MODEL_FALLBACKS) {
    const model = getModel();
    if (!model) continue;
    try {
      const response = await postToGemini(prompt, model);

      const candidateTexts =
        response?.candidates
          ?.flatMap((candidate) => candidate?.content?.parts || [])
          .map((part) => part?.text)
          .filter(Boolean) || [];

      const raw = candidateTexts.join('\n').trim();
      console.log(`🔍 RAW MODEL OUTPUT (${model}):`, raw);

      const parsed = safeJsonParse(raw);
      if (!parsed) {
        throw new Error('Model did not return valid JSON.');
      }

      return parsed;
    } catch (err) {
      lastError = err;
      // If 404 or model not found, try next model
      if (String(err.message).includes('404')) {
        console.warn(`⚠️ Model ${getModel()} unavailable, trying next fallback`);
        continue;
      }
      throw err;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('No Gemini models available');
}

function coerceTicketCount(value) {
  if (value == null) return 1;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) return Math.floor(numeric);
  if (typeof value === 'string') {
    const cleaned = value.trim().toLowerCase();
    return numberWords[cleaned] || 1;
  }
  return 1;
}

/**
 * ✅ IMPROVED: Fuzzy event matching with better scoring
 */
function resolveEvent(eventName, normalizedEvents) {
  if (!eventName) return null;
  
  // Handle arrays (take first element)
  if (Array.isArray(eventName)) {
    console.warn('resolveEvent: eventName is array, taking first element');
    eventName = eventName[0];
    if (!eventName) return null;
  }
  
  // Check if string
  if (typeof eventName !== 'string') {
    console.warn('resolveEvent: eventName not a string:', typeof eventName);
    if (eventName && typeof eventName === 'object' && eventName.name) {
      eventName = eventName.name;
    } else {
      return null;
    }
  }
  
  const cleaned = eventName.trim().toLowerCase();
  if (!cleaned) return null;

  // Strategy 1: Exact match
  const exactMatch = normalizedEvents.find((e) => e.nameLower === cleaned);
  if (exactMatch) {
    console.log(`✅ Exact match found: "${cleaned}" → "${exactMatch.original.name}"`);
    return exactMatch;
  }

  // Strategy 2: Substring match (event name contains user's keyword)
  const containsMatch = normalizedEvents.find((e) => e.nameLower.includes(cleaned));
  if (containsMatch) {
    console.log(`✅ Contains match: "${cleaned}" → "${containsMatch.original.name}"`);
    return containsMatch;
  }

  // Strategy 3: Reverse substring (user's keyword contains part of event name)
  const reverseMatch = normalizedEvents.find((e) => cleaned.includes(e.nameLower));
  if (reverseMatch) {
    console.log(`✅ Reverse match: "${cleaned}" → "${reverseMatch.original.name}"`);
    return reverseMatch;
  }

  // Strategy 4: Word-by-word matching (fuzzy)
  const userWords = cleaned.split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const event of normalizedEvents) {
    const eventWords = event.nameLower.split(/\s+/);
    let score = 0;

    // Count how many words match
    for (const userWord of userWords) {
      for (const eventWord of eventWords) {
        if (eventWord.includes(userWord) || userWord.includes(eventWord)) {
          score++;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = event;
    }
  }

  if (bestMatch && bestScore > 0) {
    console.log(`✅ Fuzzy match (score ${bestScore}): "${cleaned}" → "${bestMatch.original.name}"`);
    return bestMatch;
  }

  console.warn(`❌ No match found for: "${cleaned}"`);
  return null;
}

/**
 * ✅ IMPROVED: Extract event name from user text as fallback
 */
function extractEventKeywordFromText(text, normalizedEvents) {
  if (!text) return null;
  
  const cleaned = text.toLowerCase().trim();
  
  // Common event keywords to look for
  const keywords = [
    'basketball', 'football', 'baseball', 'soccer', 'hockey',
    'concert', 'music', 'jazz', 'rock', 'spring', 'summer', 'fall', 'winter',
    'hackathon', 'hack', 'coding', 'tech',
    'homecoming', 'championship', 'game', 'match',
    'festival', 'fair', 'party', 'bash'
  ];
  
  // Find first keyword that appears in text
  for (const keyword of keywords) {
    if (cleaned.includes(keyword)) {
      console.log(`📝 Extracted keyword from text: "${keyword}"`);
      return keyword;
    }
  }
  
  // Try to find any event name mentioned
  for (const event of normalizedEvents) {
    const eventWords = event.nameLower.split(/\s+/);
    for (const word of eventWords) {
      if (word.length > 3 && cleaned.includes(word)) {
        console.log(`📝 Extracted word from text: "${word}"`);
        return word;
      }
    }
  }
  
  return null;
}

function normalizeIntent(rawIntent) {
  if (!rawIntent) return 'unknown';
  
  let intentStr = String(rawIntent).toLowerCase().trim();
  
  if (intentStr.includes('|')) {
    console.warn('Intent contains pipes, extracting:', intentStr);
    const parts = intentStr.split('|').map(s => s.trim());
    const validIntents = ['greet', 'show_events', 'event_details', 'book', 'confirm', 'cancel'];
    
    for (const part of parts) {
      if (validIntents.includes(part)) {
        intentStr = part;
        break;
      }
    }
  }
  
  const intentMap = {
    'greeting': 'greet',
    'hello': 'greet',
    'hi': 'greet',
    'list': 'show_events',
    'show': 'show_events',
    'events': 'show_events',
    'details': 'event_details',
    'info': 'event_details',
    'booking': 'book',
    'reserve': 'book',
    'yes': 'confirm',
    'ok': 'confirm',
    'no': 'cancel',
    'stop': 'cancel'
  };
  
  const validIntents = ['greet', 'show_events', 'event_details', 'book', 'confirm', 'cancel', 'unknown'];
  
  if (validIntents.includes(intentStr)) {
    return intentStr;
  }
  
  for (const [key, value] of Object.entries(intentMap)) {
    if (intentStr.includes(key)) {
      return value;
    }
  }
  
  return 'unknown';
}

/**
 * ✅ IMPROVED: Fallback to text extraction if model fails
 */
function normalizePayload(payload, normalizedEvents, originalText) {
  const intent = normalizeIntent(payload.intent);

  // ✅ FIX: Safely extract eventName
  let rawEventName = null;
  if (payload.eventName) {
    if (Array.isArray(payload.eventName)) {
      rawEventName = payload.eventName[0];
    } else if (typeof payload.eventName === 'string') {
      rawEventName = payload.eventName;
    } else if (typeof payload.eventName === 'object' && payload.eventName.name) {
      rawEventName = payload.eventName.name;
    } else {
      console.warn('Unexpected eventName type:', typeof payload.eventName);
    }
  }

  // ✅ NEW: If model didn't extract event name but intent is 'book', try to extract from text
  if (!rawEventName && intent === 'book' && originalText) {
    rawEventName = extractEventKeywordFromText(originalText, normalizedEvents);
    if (rawEventName) {
      console.log(`🔧 Fallback: Extracted "${rawEventName}" from user text`);
    }
  }

  const result = {
    intent: intent,
    source: 'gemini',
    rawEventName: rawEventName,
    eventName: rawEventName,
    needsConfirmation: Boolean(payload.needsConfirmation || payload.needConfirmation)
  };

  // Handle ticket arrays
  let ticketValue = payload.tickets;
  if (Array.isArray(ticketValue)) {
    ticketValue = ticketValue[0];
  }
  
  const tickets = coerceTicketCount(ticketValue);
  result.tickets = tickets;

  // Try to match event
  const match = resolveEvent(rawEventName, normalizedEvents);
  if (match) {
    result.event = match.original;
    result.eventId = match.original.id;
    result.eventName = match.original.name;
  }

  // show_events: return full list
  if (intent === 'show_events') {
    result.events = normalizedEvents.map((e) => e.original);
  }

  // event_details: return single event
  if (intent === 'event_details') {
    if (match) {
      delete result.events;
      result.event = match.original;
    } else {
      result.message = `I couldn't find an event named "${result.rawEventName}".`;
    }
  }

  return result;
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const codeBlockMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch {}
    }
    
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

exports.parseUserInput = async (text, events = []) => {
  if (!text?.trim()) {
    throw { status: 400, message: 'User text required' };
  }

  const normalizedEvents = events.map((event) => ({
    original: event,
    nameLower: event.name.toLowerCase()
  }));

  try {
    const llmPayload = await callGemini(text, events);
    console.log('🔍 Parsed LLM payload:', JSON.stringify(llmPayload, null, 2));
    const result = normalizePayload(llmPayload, normalizedEvents, text);
    console.log('✅ Final result:', JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.error("LLM ERROR:", err);
    throw {
      status: 503,
      message: 'Failed to parse request with the Gemini model.',
      details: err.message
    };
  }
};
