/**
 * Derives synthetic multi-modal sensor readings from known drone telemetry.
 * All values are deterministically computed — no external API needed.
 *
 * Sensor suite simulated (per PS26247 multi-modal sensor requirement):
 *   RADAR   — range, height AGL, bearing, radar cross-section (RCS), SNR
 *   RF      — frequency band, modulation, transmit power, encryption flag
 *   EO/IR   — thermal band, visual signature, IR cross-section
 *   ACOUSTIC — frequency range, SPL, acoustic profile type
 */

import type { Threat } from '@/types';

export interface SensorData {
  radar: {
    rcs: string;           // radar cross-section in m²
    height: string;        // altitude AGL
    bearing: string;       // approach bearing (true north)
    snr: string;           // signal-to-noise ratio in dB
    iff: string;           // IFF transponder response
    flightPattern: string; // flight dynamics signature
  };
  rf: {
    frequency: string;  // e.g. "2.4 / 5.8 GHz  ISM band"
    power: string;      // e.g. "20–200 mW"
    modulation: string; // e.g. "FHSS / OFDM"
    encrypted: boolean;
    protocol: string;   // specific link protocol
    hopRate: string;    // frequency hopping rate
  };
  eoIr: {
    thermal: string;       // thermal signature description
    visual: string;        // visual signature size
    irBand: string;        // e.g. "SWIR 1–2.5 μm"
    frameType: string;     // airframe classification
    irSuppression: string; // IR suppression status
  };
  acoustic: {
    freqHz: string;     // frequency range
    dbLevel: string;    // sound pressure level
    profile: string;    // acoustic profile type
    rotorCount: string; // estimated propulsion count
    motorType: string;  // propulsion type
  };
}

export function deriveSensorData(threat: Threat): SensorData {
  const { type, altitude, heading, threatRating, wingspan } = threat;

  // Parse wingspan to metres
  const wingN = parseFloat(wingspan.replace(/[^0-9.]/g, '')) || 1;
  const wingM = wingspan.toLowerCase().includes('cm') ? wingN / 100 : wingN;

  // ── RADAR ─────────────────────────────────────────────────────────────────
  // RCS scales roughly with wing area
  const rcsRaw =
    type === 'military' ? wingM * wingM * 0.004 :
    type === 'swarm'    ? 0.001 :
    wingM * wingM * 0.002;
  const snrDb =
    threatRating === 'CRITICAL' ? 24 :
    threatRating === 'HIGH'     ? 17 :
    threatRating === 'MEDIUM'   ? 11 : 5;

  // ── RF ────────────────────────────────────────────────────────────────────
  const rfFrequency =
    type === 'commercial' ? '2.4 / 5.8 GHz  (ISM unlicensed)' :
    type === 'military'   ? '4.4–4.9 GHz  (freq-hopped, LPI)' :
                            '868 MHz  (swarm mesh TDMA)';
  const rfPower =
    type === 'commercial' ? '20–200 mW  (FCC Part 15 class)' :
    type === 'military'   ? '2–5 W  (FHSS low-intercept burst)' :
                            '10–50 mW/node  (distributed mesh)';
  const rfModulation =
    type === 'commercial' ? 'FHSS / OFDM  (unencrypted)' :
    type === 'military'   ? 'LPI/LPD AES-256 encrypted' :
                            'Mesh TDMA — distributed protocol';

  // ── EO/IR ─────────────────────────────────────────────────────────────────
  const thermal =
    type === 'military'   ? 'MEDIUM — engine/turboprop heat detected' :
    type === 'commercial' ? 'LOW — brushless motor heat only' :
                            'VERY LOW — distributed micro-nodes';
  const visual =
    type === 'military' ? `LARGE airframe (${wingspan} span)` :
    type === 'swarm'    ? `SUB-VISUAL per node (${wingspan})` :
                          `SMALL target (${wingspan} span)`;
  const irBand =
    type === 'military' ? 'MWIR 3–5 μm  (engine plume)' :
    type === 'swarm'    ? 'SWIR 1–2.5 μm  (passive)' :
                          'SWIR 1–2.5 μm  (motor heat)';

  // ── ACOUSTIC ──────────────────────────────────────────────────────────────
  const freqHz =
    type === 'commercial' ? '80–4 000 Hz  (propwash + motor whine)' :
    type === 'military'   ? '150–600 Hz  (turboprop low-freq)' :
                            '2 000–8 000 Hz  (high-rpm micro-rotors)';
  const dbLevel =
    type === 'commercial' ? `${Math.round(55 + wingM * 4)} dBSPL` :
    type === 'military'   ? `${Math.round(68 + wingM * 1.5)} dBSPL` :
                            `${Math.round(50 + wingM * 12)} dBSPL`;
  const acousticProfile =
    type === 'commercial' ? 'Consumer propeller wash' :
    type === 'military'   ? 'Low-observable engine' :
                            'Distributed cluster hum';

  // ── IFF & Flight Dynamics (RADAR) ────────────────────────────────────────
  const iff =
    type === 'commercial' ? 'SSR Mode 3/A civil squawk — non-cooperative IFF' :
    type === 'military'   ? 'IFF query: NO RESPONSE — uncooperative / Mode 5 encrypted' :
                            'Multiple contacts: NO IFF — uncooperative swarm';

  const flightPattern =
    type === 'commercial' ? 'GPS hover stabilisation — micro-correction oscillations' :
    type === 'military'   ? 'CBDR approach / nap-of-earth terrain masking detected' :
                            'Formation mesh — coordinated multi-node movement';

  // ── RF Protocol & Hop Rate ────────────────────────────────────────────────
  const protocol =
    type === 'commercial' ? 'DJI OcuSync 2.0 / Lightbridge (consumer standard)' :
    type === 'military'   ? 'Mil-spec FHSS LPI/LPD — proprietary encrypted link' :
                            'IEEE 802.11p mesh / ad-hoc MAVLink swarm protocol';

  const hopRate =
    type === 'commercial' ? '~25 Hz (consumer FHSS — detectable)' :
    type === 'military'   ? '>100 Hz aggressive hopping — intercept-resistant' :
                            'TDMA distributed sync — multi-node coordinated';

  // ── EO-IR Frame Type & IR Suppression ─────────────────────────────────────
  const frameType =
    type === 'military'   ? 'Fixed-wing UCAV (high-aspect ratio, > 2 m span)' :
    type === 'swarm'      ? 'Nano/micro UAS (< 250 g per node, cluster pattern)' :
                            'Multi-rotor (quadcopter/hexacopter DJI profile)';

  const irSuppression =
    type === 'military'   ? 'Active IR suppression coating — reduced signature' :
    type === 'commercial' ? 'None — exposed motor heat radiating' :
                            'Passive — distributed micro thermal nodes';

  // ── Acoustic Motor & Rotor ────────────────────────────────────────────────
  const rotorCount =
    type === 'commercial' ? '4–8 rotors (multi-rotor — distinct blade pass frequency)' :
    type === 'military'   ? '1–2 engines (turboprop / reciprocating)' :
                            '2–4 micro-rotors per node (cluster hum)';

  const motorType =
    type === 'commercial' ? 'Brushless DC (high RPM whine — classifiable)' :
    type === 'military'   ? 'Turboprop / piston engine (low-freq resonance)' :
                            'High-RPM coreless micro-motor (ultrasonic band)';

  // ── Intent / Decoy modifiers ─────────────────────────────────────────────
  const isNeutralOrDecoy = threat.intent !== 'hostile' || threat.isDecoy;
  const iffFinal = (threat.isDecoy || threat.intent === 'neutral')
    ? 'Corner-reflector / unregistered decoy — erratic RCS flutter, no IFF'
    : threat.intent === 'friendly'
      ? 'IFF Mode 5 / SSR Mode 3/A — FRIENDLY REGISTERED TRANSIT'
      : iff;
  const flightPatternFinal = isNeutralOrDecoy
    ? 'Perimeter survey vector — non-converging, no terminal lock on protected asset'
    : flightPattern;
  const thermalFinal = isNeutralOrDecoy
    ? 'LOW — no armed munition thermal signature / decoy ballast profile'
    : thermal;

  return {
    radar: {
      rcs:          `${rcsRaw.toFixed(3)} m²`,
      height:       `${altitude} m AGL`,
      bearing:      `${heading}° true`,
      snr:          `${snrDb} dB`,
      iff:          iffFinal,
      flightPattern: flightPatternFinal,
    },
    rf: { frequency: rfFrequency, power: rfPower, modulation: rfModulation, encrypted: type === 'military', protocol, hopRate },
    eoIr: { thermal: thermalFinal, visual, irBand, frameType, irSuppression },
    acoustic: { freqHz, dbLevel, profile: acousticProfile, rotorCount, motorType },
  };
}
