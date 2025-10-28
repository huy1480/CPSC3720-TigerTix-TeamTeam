const numberWords = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12
};

let OpenAI;
try {
  OpenAI = require('openai');
} catch (err) {
  OpenAI = null;
}

const llmClient =
  OpenAI && process.env.OPENAI_API_KEY
    ? new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    : null;

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Attempt to parse the user's request using a configured LLM.
 * Returns null when the model is not available or parsing fails.
 *
 * @param {string} text - Raw user message
 * @param {Array<Object>} events - Known events for grounding
 * @returns {Promise<Object|null>}
 */
async function tryLLMParse(text, events) {
  if (!llmClient) return null;

  const eventNames = events.map((event) => event.name).join(', ') || 'No events available';
  const systemPrompt = [
    'You are an assistant that extracts ticket booking intents.',
    'Only respond with strict JSON matching this schema:',
    '{"intent":"book|show_events|greet|confirm|cancel|unknown","eventName":string|null,"tickets":number|null,"needsConfirmation":boolean}',
    'intent is "book" when the user wants to purchase tickets, "show_events" to list events, "greet" for greetings,',
    '"confirm" when the user is approving a booking, "cancel" when they retract, otherwise "unknown".',
    `Here are the events you can reference: ${eventNames}.`,
    'tickets should be an integer if provided, otherwise null.',
    'needsConfirmation should be true only when the user is asking to book or confirm a booking.'
  ].join(' ');

  try {
    const completion = await llmClient.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ]
    });

    const raw = completion?.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      ...parsed,
      source: 'llm'
    };
  } catch (err) {
    console.warn('LLM parsing failed, falling back to keyword parser:', err.message);
    return null;
  }
}

/**
 * Fallback keyword-based parser for common commands.
 *
 * @param {string} rawText - Raw user message
 * @param {Array<Object>} events - Known events
 * @returns {Object|null}
 */
function keywordFallback(rawText, events) {
  const text = rawText.trim().toLowerCase();
  if (!text) return null;

  if (/^(hi|hello|hey|howdy)\b/.test(text)) {
    return {
      intent: 'greet',
      needsConfirmation: false,
      source: 'fallback'
    };
  }

  if (/(show|list|available).*(events|tickets)/.test(text) || /events\??$/.test(text)) {
    return {
      intent: 'show_events',
      needsConfirmation: false,
      source: 'fallback'
    };
  }

  if (/^(yes|confirm|sure|please do|go ahead)\b/.test(text)) {
    return {
      intent: 'confirm',
      needsConfirmation: false,
      source: 'fallback'
    };
  }

  if (/^(no|cancel|stop|never mind)/.test(text)) {
    return {
      intent: 'cancel',
      needsConfirmation: false,
      source: 'fallback'
    };
  }

  const bookRegex = /(book|reserve|buy|purchase).*/;
  if (bookRegex.test(text)) {
    const quantity = extractQuantity(text);
    const eventMatch = matchEventFromText(text, events);

    return {
      intent: 'book',
      eventName: eventMatch ? eventMatch.name : null,
      eventId: eventMatch ? eventMatch.id : null,
      tickets: quantity || 1,
      needsConfirmation: true,
      source: 'fallback'
    };
  }

  return null;
}

/**
 * Extract ticket quantity from text by checking digits and number words.
 *
 * @param {string} text - Lowercase input text
 * @returns {number|null}
 */
function extractQuantity(text) {
  const digitMatch = text.match(/(\d+)\s*(tickets|seats)?/);
  if (digitMatch) {
    const value = Number(digitMatch[1]);
    if (!Number.isNaN(value) && value > 0) return value;
  }

  const words = Object.keys(numberWords);
  for (const word of words) {
    const regex = new RegExp(`\\b${word}\\b`);
    if (regex.test(text)) {
      return numberWords[word];
    }
  }

  return null;
}

/**
 * Attempt to match an event by name within the supplied text.
 *
 * @param {string} text - Lowercase user text
 * @param {Array<Object>} events - Known events
 * @returns {Object|null}
 */
function matchEventFromText(text, events) {
  if (!events || events.length === 0) return null;

  // Exact matches take priority
  const exact = events.find((event) => text.includes(event.nameLower));
  if (exact) return exact.original;

  // Try to parse the trailing portion after "for" or "to"
  const eventPhraseMatch = text.match(/(?:for|to|at)\s+(.+)/);
  if (eventPhraseMatch) {
    const candidate = eventPhraseMatch[1].trim();
    const normalized = candidate.replace(/tickets?|seats?|please|thanks?/g, '').trim();
    if (normalized) {
      const fuzzy = events.find((event) => event.nameLower.includes(normalized) || normalized.includes(event.nameLower));
      if (fuzzy) return fuzzy.original;
    }
  }

  // Fallback to widest fuzzy match
  const fuzzy = events.find((event) => {
    const words = event.nameLower.split(/\s+/);
    return words.some((word) => word.length > 3 && text.includes(word));
  });

  return fuzzy ? fuzzy.original : null;
}

/**
 * Ensure payload fields align with known events and include metadata.
 *
 * @param {Object} payload - Structured response from LLM or fallback
 * @param {Array<Object>} events - Known events with lower-case helper fields
 * @param {string} source - Source identifier (llm|fallback)
 * @returns {Object}
 */
function normalizePayload(payload, events, source) {
  const result = {
    intent: payload.intent || 'unknown',
    source,
    needsConfirmation: Boolean(payload.needsConfirmation),
    rawEventName: payload.eventName || null,
    eventName: payload.eventName || null
  };

  if (payload.tickets != null) {
    const parsedTickets = Number(payload.tickets);
    if (!Number.isNaN(parsedTickets) && parsedTickets > 0) {
      result.tickets = Math.floor(parsedTickets);
    }
  }

  if (result.intent === 'book') {
    result.needsConfirmation = true;
  }

  if (result.intent === 'show_events') {
    result.events = events.map((event) => event.original);
  }

  if (payload.intent === 'book' && payload.eventId) {
    const matched = events.find((event) => event.original.id === payload.eventId);
    if (matched) {
      result.event = matched.original;
      result.eventId = matched.original.id;
      result.eventName = matched.original.name;
    }
  }

  if (payload.intent === 'book' && !result.event) {
    const eventNameLower = (payload.eventName || '').toLowerCase();
    if (eventNameLower) {
      const match = events.find((event) => event.nameLower === eventNameLower);
      if (match) {
        result.event = match.original;
        result.eventId = match.original.id;
        result.eventName = match.original.name;
      }
    }

    if (!result.event && eventNameLower) {
      const fuzzy = events.find(
        (event) => event.nameLower.includes(eventNameLower) || eventNameLower.includes(event.nameLower)
      );
      if (fuzzy) {
        result.event = fuzzy.original;
        result.eventId = fuzzy.original.id;
        result.eventName = fuzzy.original.name;
      }
    }
  }

  if (result.intent === 'book' && !result.tickets) {
    result.tickets = 1;
  }

  return result;
}

/**
 * Safe JSON parse helper for LLM output.
 *
 * @param {string} raw - LLM output
 * @returns {Object|null}
 */
function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (nestedErr) {
      return null;
    }
  }
}

/**
 * High-level parser used by controllers.
 *
 * @param {string} text - User text input
 * @param {Array<Object>} events - Events fetched from the database
 * @returns {Promise<Object>}
 */
exports.parseUserInput = async (text, events = []) => {
  if (!text || !text.trim()) {
    throw { status: 400, message: 'User text is required for parsing' };
  }

  const normalizedEvents = events.map((event) => ({
    original: event,
    nameLower: event.name.toLowerCase()
  }));

  const llmResult = await tryLLMParse(text, normalizedEvents);
  if (llmResult) {
    return normalizePayload(llmResult, normalizedEvents, 'llm');
  }

  const fallbackResult = keywordFallback(text, normalizedEvents);
  if (fallbackResult) {
    return normalizePayload(fallbackResult, normalizedEvents, 'fallback');
  }

  throw {
    status: 422,
    message: 'Sorry, I was not able to understand that request.'
  };
};
