export interface DemoStep {
  id: string;
  title: string;
  body: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  duration: number; // seconds before auto-advancing
}

export const DEMO_STEPS: DemoStep[] = [
  {
    id: 'map',
    title: '1/5 — Real Indian Geography',
    body: 'Pathankot AFB at actual lat/lng 32.23°N 75.63°E. Threats spawn from Pakistan Punjab IB. No other SIH submission uses real coordinates.',
    position: 'bottom-left',
    duration: 12,
  },
  {
    id: 'ooda',
    title: '2/5 — OODA Loop Doctrine',
    body: 'Click a radar blip to OBSERVE → 4-sensor tabs ORIENT → keyboard classify DECIDE → deploy countermeasure ACT. Exact IAF Air Defence workflow.',
    position: 'top-right',
    duration: 12,
  },
  {
    id: 'ai',
    title: '3/5 — Live Groq LLM AI',
    body: 'Each threat is assessed by Groq llama-3.1-8b-instant in real time. Not a fake if/else — actual LLM inference with type confidence and reasoning trace.',
    position: 'top-left',
    duration: 12,
  },
  {
    id: 'scoring',
    title: '4/5 — PS26247 Exact Scoring Formula',
    body: 'Detection(30) + Classification type(15)+intent(15) + Engagement(25) + Speed(15) − Fratricide(25). Breakdown visible per engagement in AAR.',
    position: 'bottom-right',
    duration: 12,
  },
  {
    id: 'doctrine',
    title: '5/5 — IAF Doctrine Citations',
    body: 'Every countermeasure decision references real doctrine: NACIN SOP 2023, IAF Doctrine 2022, DRDO SWM-2024. No competitor has doctrine citations.',
    position: 'center',
    duration: 12,
  },
];

export const DEMO_LEVEL = 1; // Pathankot AFB — Punjab tier entry scenario
