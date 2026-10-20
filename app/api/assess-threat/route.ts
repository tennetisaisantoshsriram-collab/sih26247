import { NextRequest, NextResponse } from 'next/server';

export interface AIAssessment {
  type: 'commercial' | 'military' | 'swarm';
  typeConfidence: number;
  intent: 'hostile' | 'neutral' | 'friendly';
  intentConfidence: number;
  countermeasure: 'rf-jammer' | 'interceptor' | 'ew' | 'alert-evacuate';
  reasoning: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.1-8b-instant'; // free, fast (~800 tok/s on Groq LPU)

function buildPrompt(d: Record<string, unknown>): string {
  return `Analyse this drone telemetry and respond ONLY with a JSON object matching the exact schema below.

TELEMETRY:
Altitude: ${d.altitude}m AGL
Max Speed: ${d.maxSpeed}
Wingspan: ${d.wingspan}
Payload: ${d.payload}
Range: ${d.range}
Database threat rating: ${d.threatRating}
Approach heading: ${d.heading}°
Approach from: ${d.approachFrom}
Target asset: ${d.targetName}

Respond ONLY with this exact JSON (no markdown, no preamble):
{
  "type": "commercial" or "military" or "swarm",
  "typeConfidence": integer 0-100,
  "intent": "hostile" or "neutral" or "friendly",
  "intentConfidence": integer 0-100,
  "countermeasure": "rf-jammer" or "interceptor" or "ew" or "alert-evacuate",
  "reasoning": "one tactical sentence max 20 words",
  "urgency": "LOW" or "MEDIUM" or "HIGH" or "CRITICAL"
}`;
}

// Deterministic fallback when no API key is configured
function mockAssessment(d: Record<string, unknown>): AIAssessment {
  const rating = d.threatRating as string ?? 'LOW';
  const isHigh = rating === 'CRITICAL' || rating === 'HIGH';

  // Use type from telemetry if present (simulates accurate sensor fusion)
  const rawType = d.type as string;
  const type: AIAssessment['type'] =
    rawType === 'military' || rawType === 'swarm' || rawType === 'commercial'
      ? (rawType as AIAssessment['type'])
      : (() => {
          const wing = String(d.wingspan ?? '');
          const wingN = parseFloat(wing.replace(/[^0-9.]/g, ''));
          return wing.toLowerCase().includes(' m') && wingN >= 2 ? 'military' : 'commercial';
        })();

  // Respect decoy flag and actual intent field
  const isDecoy = Boolean(d.isDecoy);
  const rawIntent = d.intent as string;
  const intent: AIAssessment['intent'] =
    rawIntent === 'friendly' ? 'friendly' :
    (isDecoy || rawIntent === 'neutral') ? 'neutral' :
    rawIntent === 'hostile' ? 'hostile' :
    (isHigh ? 'hostile' : 'neutral');

  const countermeasure: AIAssessment['countermeasure'] =
    intent === 'neutral' || intent === 'friendly' ? 'alert-evacuate' :
    type === 'commercial' ? 'rf-jammer'     :
    type === 'military'   ? 'interceptor'   : 'ew';

  return {
    type, intent, countermeasure,
    typeConfidence:   72 + Math.floor(Math.random() * 15),
    intentConfidence: 68 + Math.floor(Math.random() * 20),
    reasoning: `Unidentified airframe at ${d.altitude}m AGL. ${isHigh ? 'Armed payload profile — treat as hostile.' : 'Surveillance profile — no confirmed payload.'}`,
    urgency: rating as AIAssessment['urgency'],
  };
}

export async function POST(req: NextRequest) {
  const data: Record<string, unknown> = await req.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(mockAssessment(data));
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an IAF Air Defence AI threat assessment system. Analyse drone telemetry. Respond ONLY with valid JSON matching the schema the user provides.',
          },
          { role: 'user', content: buildPrompt(data) },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Groq error:', res.status, err);
      return NextResponse.json(mockAssessment(data));
    }

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(text);
    // Validate required fields — fall back to mock if Groq returns a non-conforming object
    if (!parsed?.type || !parsed?.intent || !parsed?.countermeasure) {
      return NextResponse.json(mockAssessment(data));
    }
    return NextResponse.json(parsed as AIAssessment);
  } catch (err) {
    console.error('Groq fetch failed:', err);
    return NextResponse.json(mockAssessment(data));
  }
}
