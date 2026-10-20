import { NextRequest, NextResponse } from 'next/server';
import type { CoachingReport } from '@/lib/adaptiveEngine';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const MOCK_COACHING: Record<string, CoachingReport> = {
  commercial: {
    focusAreas: ['Commercial drone recognition', 'RF jamming decision speed', 'GPS-hover pattern identification'],
    tacticalAdvice: 'Commercial drones rely on 2.4/5.8 GHz RF links and GNSS. Key indicator: GPS-stabilised hover behaviour with no thermal signature.',
    drillRecommendation: 'Replay Punjab Tier scenarios 1–50. Focus on commercial/neutral discrimination under fog conditions.',
    mentalModel: 'Hovers with correction bursts + no engine heat = GPS-stabilised commercial. Deploy RF jammer — severs control link.',
  },
  military: {
    focusAreas: ['Military UCAV identification', 'Encrypted comms signature', 'Interceptor timing window'],
    tacticalAdvice: 'Military UCAVs use AES-encrypted frequency-hopping comms immune to jamming. Fixed-wing profile at 200m+ AGL. Only hard-kill is effective.',
    drillRecommendation: 'Work through J&K LoC scenarios 201–300 for Burraq and CH-4B classification under degraded sensors.',
    mentalModel: 'Fixed-wing straight-line flight at altitude + high threat rating = UCAV. RF jammer ineffective. Interceptor only.',
  },
  swarm: {
    focusAreas: ['Swarm mesh network recognition', 'EW deployment timing', 'Multi-target prioritisation'],
    tacticalAdvice: 'Swarms use IEEE 802.11p mesh networking. Individual engagement is ineffective. Broadband EW disrupts inter-node coordination simultaneously.',
    drillRecommendation: 'Practice NCR Commander scenarios (801–850) for multi-vector swarm response under SCRAMBLE alert.',
    mentalModel: 'Three or more simultaneous coordinated contacts = swarm. Skip classification — deploy EW to collapse the mesh.',
  },
};

export async function POST(req: NextRequest) {
  const { weakAreas, sessions, operatorName }: {
    weakAreas: string[];
    sessions: number;
    operatorName: string;
  } = await req.json();

  if (!Array.isArray(weakAreas) || weakAreas.length === 0) {
    return NextResponse.json(MOCK_COACHING.commercial);
  }

  const apiKey = process.env.GROQ_API_KEY;
  const primaryWeak = weakAreas[0] ?? 'commercial';

  if (!apiKey) {
    return NextResponse.json(MOCK_COACHING[primaryWeak] ?? MOCK_COACHING.commercial);
  }

  try {
    const prompt = `You are an IAF Air Defence training instructor providing a post-training AI coaching report.

Trainee: ${operatorName || 'Operator'}
Sessions completed: ${sessions}
Weak areas (accuracy below 70%): ${weakAreas.join(', ')}

Respond ONLY with this exact JSON (no markdown, no preamble):
{
  "focusAreas": ["2-3 specific skill gaps as short noun phrases"],
  "tacticalAdvice": "One tactical paragraph under 40 words about the primary weakness using IAF doctrine terminology",
  "drillRecommendation": "Specific drill scenario recommendation under 20 words",
  "mentalModel": "One memorable mental model for identifying the weak threat type under 30 words"
}`;

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 350,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are an IAF Air Defence training instructor. Provide coaching reports in the exact JSON schema the user specifies.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) return NextResponse.json(MOCK_COACHING[primaryWeak] ?? MOCK_COACHING.commercial);
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? '{}';
    return NextResponse.json(JSON.parse(text) as CoachingReport);
  } catch {
    return NextResponse.json(MOCK_COACHING[primaryWeak] ?? MOCK_COACHING.commercial);
  }
}
