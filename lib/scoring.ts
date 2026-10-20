import { Decision } from '@/types';
import { isValidCountermeasure } from '@/lib/scenario';

// PS26247 scoring formula:
//   Detection speed    30 pts — fast spawn-to-detect time
//   Classification     30 pts — type (15) + intent (15) accuracy
//   Engagement decision 25 pts — correct doctrine countermeasure
//   Speed/Consistency  15 pts — fast classify-to-deploy response
//   Fratricide penalty −25 pts — hostile engagement of neutral/friendly asset
//   Max per engagement: 100 pts

const MAX_DET_MS  = 15_000;  // ≥15 s to detect  → 0 pts
const MAX_RESP_MS = 10_000;  // ≥10 s to classify → 0 pts

export function scoreDecision(decision: Decision): number {
  // Detection speed (30 pts)
  const detMs = decision.detectionTimeMs ?? MAX_DET_MS;
  const detScore = Math.round(Math.max(0, 30 * (1 - detMs / MAX_DET_MS)));

  // Classification accuracy (30 pts): type 15 + intent 15
  const typeScore   = decision.classifiedAs      === decision.threatType ? 15 : 0;
  const intentScore = decision.classifiedIntent  === decision.intent     ? 15 : 0;

  // Engagement decision (25 pts): correct doctrine countermeasure (independent of type/intent)
  const decScore = isValidCountermeasure(decision.threatType, decision.intent, decision.countermeasure) ? 25 : 0;

  // Speed / consistency (15 pts): fast classify-to-deploy
  const respMs    = decision.responseTimeMs;
  const speedScore = Math.round(Math.max(0, 15 * (1 - respMs / MAX_RESP_MS)));

  // Fratricide penalty: classified neutral/friendly as hostile → −25 pts
  const fratricide =
    decision.intent !== 'hostile' && decision.classifiedIntent === 'hostile' ? -25 : 0;

  return Math.max(0, detScore + typeScore + intentScore + decScore + speedScore + fratricide);
}

export function computeSessionScore(decisions: Decision[]): number {
  const base = decisions.reduce((sum, d) => sum + scoreDecision(d), 0);

  // Session consistency bonus (PS: difficulty adjustment + consistency scoring)
  if (decisions.length === 0) return 0;
  const correct = decisions.filter(d => d.correct).length;
  const accuracy = correct / decisions.length;
  const zeroBreach = decisions.every(d => d.classifiedIntent !== 'hostile' || d.intent === 'hostile'); // no fratricide
  const consistencyBonus =
    accuracy === 1.0 && zeroBreach ? 100 :  // perfect run
    accuracy >= 0.9              ? 50  :
    accuracy >= 0.8              ? 25  : 0;

  return base + consistencyBonus;
}

export function getMissionGrade(decisions: Decision[], breachCount: number): { grade: string; color: string; label: string } {
  if (decisions.length === 0) return { grade: 'F', color: '#ef4444', label: 'No Engagement' };
  const accuracy = decisions.filter(d => d.correct).length / decisions.length * 100;
  if (accuracy >= 90 && breachCount === 0) return { grade: 'S', color: '#f59e0b', label: 'Outstanding' };
  if (accuracy >= 80)  return { grade: 'A', color: '#22c55e',  label: 'Excellent' };
  if (accuracy >= 70)  return { grade: 'B', color: '#3b82f6',  label: 'Good' };
  if (accuracy >= 60)  return { grade: 'C', color: '#8b5cf6',  label: 'Satisfactory' };
  if (accuracy >= 50)  return { grade: 'D', color: '#f97316',  label: 'Needs Work' };
  return                      { grade: 'F', color: '#ef4444',  label: 'Unsatisfactory' };
}

export function avgResponseTime(decisions: Decision[]): number {
  if (decisions.length === 0) return 0;
  return Math.round(decisions.reduce((sum, d) => sum + d.responseTimeMs, 0) / decisions.length);
}

export function classificationAccuracy(decisions: Decision[]): number {
  if (decisions.length === 0) return 0;
  return Math.round((decisions.filter(d => d.correct).length / decisions.length) * 100);
}
