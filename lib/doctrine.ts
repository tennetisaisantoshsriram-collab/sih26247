import { ThreatType, Intent, CountermeasureType } from '@/types';
import { isValidCountermeasure } from '@/lib/scenario';

export interface DoctrineEntry {
  countermeasure: CountermeasureType;
  why: string;
  reference: string;
}

export function getDoctrine(type: ThreatType, intent: Intent): DoctrineEntry {
  if (intent === 'neutral' || intent === 'friendly') {
    return {
      countermeasure: 'alert-evacuate',
      why: 'Non-hostile aircraft must NEVER be kinetically engaged without confirmed hostile intent and command authorisation. Alert the zone and evacuate — misclassification leading to engagement is a court-martial offence under IAF Rules.',
      reference: 'IAF Air Defence ROE, Section 7.3 — Non-hostile contact protocol',
    };
  }
  if (type === 'commercial') {
    return {
      countermeasure: 'rf-jammer',
      why: 'Commercial drones rely on unencrypted RF control links (2.4 GHz / 5.8 GHz) and GNSS navigation. Directional RF Jamming (rf-jammer) severs the command channel and forces return-to-home or auto-land. Alternatively, GNSS Spoofing / Cyber-Hijack (gnss-spoof) redirects the drone to a pre-designated Quarantine LZ. Both are valid Tier-1 soft-kill options with no kinetic risk to surroundings.',
      reference: 'NACIN Counter-UAS SOP 2023, Appendix B — Tier-1 soft-kill protocol',
    };
  }
  if (type === 'military') {
    return {
      countermeasure: 'interceptor',
      why: 'Military UCAVs (Burraq, CH-4, TB001) use AES-encrypted, frequency-hopping comms resistant to jamming. Hard-kill via Kinetic SAM / Interceptor (interceptor) guarantees neutralisation. In urban or restricted airspace, the 10kW Fiber Laser DEW (laser-dew) is the preferred alternative — zero debris risk, unlimited magazine. Both are valid hard-kill options requiring positive ID before deployment.',
      reference: 'IAF Air Defence Doctrine 2022, Ch.4 — Hostile UCAV engagement protocol',
    };
  }
  return {
    countermeasure: 'ew',
    why: 'Swarms use mesh networking (IEEE 802.11p / custom protocols) — targeting individual units is ineffective. Broadband Electronic Warfare disrupts the entire swarm\'s inter-node coordination simultaneously, causing collapse of autonomous behaviour.',
    reference: 'DRDO Counter-Swarm Doctrine SWM-2024 — Electronic neutralisation of coordinated UAS',
  };
}

export function getDecisionFeedback(
  classified: ThreatType,
  classifiedIntent: Intent,
  actual: ThreatType,
  actualIntent: Intent,
  deployedCm: CountermeasureType,
): { correct: boolean; title: string; message: string } {
  const typeMatch = classified === actual;
  const intentMatch = classifiedIntent === actualIntent;
  const doctrine = getDoctrine(actual, actualIntent);
  const correct = typeMatch && intentMatch && isValidCountermeasure(actual, actualIntent, deployedCm);

  if (correct) {
    return {
      correct: true,
      title: 'CORRECT ENGAGEMENT',
      message: `${doctrine.why} Ref: ${doctrine.reference}`,
    };
  }
  if (!typeMatch) {
    return {
      correct: false,
      title: `MISCLASSIFICATION — actual type: ${actual.toUpperCase()}`,
      message: `Correct response: ${doctrine.countermeasure.toUpperCase()}. ${doctrine.why}`,
    };
  }
  if (!intentMatch) {
    return {
      correct: false,
      title: `INTENT ERROR — actual intent: ${actualIntent.toUpperCase()}`,
      message: `Correct response: ${doctrine.countermeasure.toUpperCase()}. ${doctrine.why}`,
    };
  }
  return {
    correct: false,
    title: `WRONG COUNTERMEASURE — should have used: ${doctrine.countermeasure.toUpperCase()}`,
    message: doctrine.why,
  };
}
