const http = require('http');
const https = require('https');
const { URL } = require('url');

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

// Default Ollama settings
const OLLAMA_HOST = process.env.OLLAMA_HOST?.trim() || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || 'llama3:latest';

/**
 * Send JSON POST request to Ollama
 */
function postJson(endpoint, payload) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(endpoint, OLLAMA_HOST);
    } catch (error) {
      return reject(new Error(`Invalid Ollama host: ${error.message}`));
    }

    const data = JSON.stringify(payload);
    const isSecure = target.protocol === 'https:';
    const transport = isSecure ? https : http;

    const request = transport.request(
      {
        hostname: target.hostname,
        port: target.port || (isSecure ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: 15000
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');

        response.on('data', (chunk) => (body += chunk));

        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            return reject(
              new Error(`Ollama status ${response.statusCode}: ${body}`)
            );
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error(`Bad JSON from Ollama: ${err.message}`));
          }
        });
      }
    );

    request.on('error', reject);
    request.write(data);
    request.end();
  });
}

/**
 * System prompt builder
 */
function buildSystemPrompt(events = []) {
  const eventSummary =
    events.length === 0
      ? 'No events are currently available.'
      : events
          .map(
            (event) =>
              `"${event.name}" on ${event.date} with ${event.tickets} tickets remaining`
          )
          .join('; ');

  return `
You are the TigerTix booking parser. Interpret user requests about campus events and tickets.
Respond STRICTLY with JSON matching this schema:
{"intent":"book|show_events|event_details|greet|confirm|cancel|unknown","eventName":string|null,"eventId":number|null,"tickets":number|null,"needsConfirmation":boolean}

Intent meanings:
- book: user requests to buy tickets
- show_events: user asks to see a full list of events
- event_details: user requests info about a specific event (time, tickets, location, etc.)
- greet: greeting only
- confirm: user is confirming a booking
- cancel: user cancels the booking process
- unknown: anything unclear

Known events: ${eventSummary}
  `.trim();
}

/**
 * Ask Ollama to parse the input
 */
async function callOllama(text, events) {
  const systemPrompt = buildSystemPrompt(events);

  const payload = {
    model: OLLAMA_MODEL,
    prompt: `${systemPrompt}\n\nUser: ${text}\nAssistant:`,
    format: 'json',
    stream: false
  };

  const response = await postJson('/api/generate', payload);

  if (!response?.response) {
    throw new Error('Unexpected Ollama format — missing response.response');
  }

  const raw = response.response.trim();
  console.log("🔍 RAW MODEL OUTPUT:", raw);

  const parsed = safeJsonParse(raw);
  if (!parsed) {
    throw new Error('Model did not return valid JSON.');
  }

  return parsed;
}

/**
 * Convert settings to internal payload
 */
function coerceTicketCount(value) {
  if (value == null) return undefined;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) return Math.floor(numeric);
  if (typeof value === 'string') {
    const cleaned = value.trim().toLowerCase();
    return numberWords[cleaned];
  }
  return undefined;
}

/**
 * Try to match model event to real one
 */
function resolveEvent(eventName, normalizedEvents) {
  if (!eventName) return null;
  const cleaned = eventName.trim().toLowerCase();
  if (!cleaned) return null;

  return (
    normalizedEvents.find((e) => e.nameLower === cleaned) ||
    normalizedEvents.find(
      (e) => e.nameLower.includes(cleaned) || cleaned.includes(e.nameLower)
    ) ||
    null
  );
}

/**
 * Convert model JSON into your standard TigerTix structure
 */
function normalizePayload(payload, normalizedEvents) {
  const intent = (payload.intent || '').toLowerCase().trim();

  const result = {
    intent: intent || 'unknown',
    source: 'ollama',
    rawEventName: payload.eventName || null,
    eventName: payload.eventName || null,
    needsConfirmation: Boolean(payload.needsConfirmation)
  };

  const tickets = coerceTicketCount(payload.tickets);
  if (tickets) result.tickets = tickets;
  if (intent === 'book' && !result.tickets) result.tickets = 1;

  const match = resolveEvent(payload.eventName, normalizedEvents);
  if (match) {
    result.event = match.original;
    result.eventId = match.original.id;
    result.eventName = match.original.name;
  }

  // ✅ show_events: return full list
  if (intent === 'show_events') {
    result.events = normalizedEvents.map((e) => e.original);
  }

  // ✅ event_details: return a single event — no full list
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

/**
 * JSON rescue parser
 */
function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

/**
 * Exported high-level function
 */
exports.parseUserInput = async (text, events = []) => {
  if (!text?.trim()) {
    throw { status: 400, message: 'User text required' };
  }

  const normalizedEvents = events.map((event) => ({
    original: event,
    nameLower: event.name.toLowerCase()
  }));

  try {
    const llmPayload = await callOllama(text, events);
    return normalizePayload(llmPayload, normalizedEvents);
  } catch (err) {
    console.error("🛑 LLM ERROR:", err);
    throw {
      status: 503,
      message: 'Failed to parse request with the Ollama model.',
      details: err.message
    };
  }
};
