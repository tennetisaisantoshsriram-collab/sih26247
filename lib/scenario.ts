import { Threat, ThreatType, Intent, Difficulty, CountermeasureType } from '@/types';
import { Level, getLevel } from '@/lib/levels';
import { getRandomDroneModel } from '@/lib/droneModels';

// ── Legacy difficulty config (kept for backward compat with tests) ────────────
const DIFFICULTY_CONFIG = {
  easy:   { maxConcurrent: 1,  speed: 0.0003, types: ['commercial'] as ThreatType[], nightMode: false, decoys: false, sessionDuration: 90  },
  medium: { maxConcurrent: 3,  speed: 0.0006, types: ['commercial', 'military'] as ThreatType[], nightMode: true, decoys: false, sessionDuration: 120 },
  hard:   { maxConcurrent: 10, speed: 0.0010, types: ['commercial', 'military', 'swarm'] as ThreatType[], nightMode: true, decoys: true, sessionDuration: 120 },
};

const LEGACY_TARGET = { lat: 20.5937, lng: 78.9629 };

/**
 * Spawn a point at `radius` degrees from the target, within the given compass-bearing sector.
 * Bearing 0° = North, 90° = East, 180° = South, 270° = West (standard compass convention).
 */
function spawnInSector(
  targetLat: number,
  targetLng: number,
  sectors: Array<{ min: number; max: number }>,
  radius: number,
): { lat: number; lng: number } {
  // Pick a random sector from the array
  const sector = sectors[Math.floor(Math.random() * sectors.length)];
  // Random bearing within sector — handles wrap-around (e.g. min=350, max=30)
  const range = sector.max > sector.min ? sector.max - sector.min : sector.max + 360 - sector.min;
  const bearingDeg = (sector.min + Math.random() * range) % 360;
  const bearingRad = bearingDeg * (Math.PI / 180);
  // Convert compass bearing to lat/lng offset:
  //   lat offset = cos(bearing) * radius  (North = positive lat)
  //   lng offset = sin(bearing) * radius  (East  = positive lng)
  return {
    lat: targetLat + Math.cos(bearingRad) * radius,
    lng: targetLng + Math.sin(bearingRad) * radius,
  };
}

// ── Legacy random-edge spawn (kept for spawnThreat(difficulty)) ───────────────
function randomEdgePoint(): { lat: number; lng: number } {
  const angle = Math.random() * 2 * Math.PI;
  return {
    lat: LEGACY_TARGET.lat + Math.cos(angle) * 3,
    lng: LEGACY_TARGET.lng + Math.sin(angle) * 3,
  };
}

// ── Public: legacy difficulty-based spawn ─────────────────────────────────────
export function spawnThreat(difficulty: Difficulty, isDecoy = false): Threat {
  const config = DIFFICULTY_CONFIG[difficulty];
  const type: ThreatType = config.types[Math.floor(Math.random() * config.types.length)];
  const spawn = randomEdgePoint();
  const intent: Intent = isDecoy ? 'neutral' : 'hostile';
  const model = getRandomDroneModel(type);

  return {
    id: Math.random().toString(36).slice(2),
    type, intent,
    lat: spawn.lat, lng: spawn.lng,
    targetLat: LEGACY_TARGET.lat, targetLng: LEGACY_TARGET.lng,
    spawnedAt: Date.now(),
    speed: config.speed,
    isDecoy, neutralized: false, detected: false, breached: false, path: [],
    modelName: model.name, origin: model.origin,
    wingspan: model.wingspan, maxSpeed: model.maxSpeed,
    payload: model.payload, range: model.range,
    threatRating: model.threat,
    altitude: Math.round(50 + Math.random() * 450),
    heading: Math.round(Math.random() * 360),
  };
}

// ── Public: level-based realistic spawn ──────────────────────────────────────
export function spawnThreatFromLevel(levelNum: number, isDecoy = false, typeOverride?: ThreatType, isTransit = false, transitTarget?: { lat: number; lng: number; name: string }): Threat {
  const level = getLevel(levelNum);
  const type: ThreatType = typeOverride ?? level.types[Math.floor(Math.random() * level.types.length)];
  const spawn = spawnInSector(
    level.targetLat, level.targetLng,
    level.spawnSectors, level.spawnRadius,
  );
  const intent: Intent = isDecoy ? 'neutral' : (Math.random() < 0.12 ? 'friendly' : 'hostile');
  const model = getRandomDroneModel(type);

  // If cross-sector transit threat (e.g. crossing Pathankot enroute to Adampur/Ambala):
  // Flight vector points towards the distant strategic target instead of current base center
  const destLat = isTransit && transitTarget ? transitTarget.lat : level.targetLat;
  const destLng = isTransit && transitTarget ? transitTarget.lng : level.targetLng;

  const dLat = destLat - spawn.lat;
  const dLng = destLng - spawn.lng;
  const headingRad = Math.atan2(dLng, dLat); // atan2(east, north) → bearing from north
  const heading = Math.round(((headingRad * 180 / Math.PI) + 360) % 360);

  // Altitude: higher for military/swarm, lower for commercial sneaking in
  const altBase = type === 'commercial' ? 30 : type === 'military' ? 200 : 80;
  const altitude = Math.round(altBase + Math.random() * 300);

  // Exact firing battery station assigned at the defending base
  const batteryStation = {
    name: type === 'military' ? 'Akash-NG / QRSAM SAM Battery Launcher' :
          type === 'swarm' ? 'Broadband High-Power Microwave (HPM) Array' :
          model.isFiberOptic ? '10kW High-Energy Laser DEW Turret #1' :
          'D-4 Directional RF High-Gain Jammer Mast',
    lat: level.targetLat + (type === 'military' ? -0.0035 : type === 'swarm' ? -0.0022 : 0.0045),
    lng: level.targetLng + (type === 'military' ? 0.0055 : type === 'swarm' ? -0.0035 : 0.0038),
  };

  return {
    id: Math.random().toString(36).slice(2),
    type, intent,
    lat: spawn.lat, lng: spawn.lng,
    targetLat: destLat, targetLng: destLng,
    spawnedAt: Date.now(),
    speed: isTransit ? level.speed * 1.15 : level.speed,
    isDecoy, neutralized: false, detected: false, breached: false, path: [],
    modelName: model.name, origin: model.origin,
    wingspan: model.wingspan, maxSpeed: model.maxSpeed,
    payload: model.payload, range: model.range,
    threatRating: model.threat,
    altitude,
    heading,
    flightProfile: model.flightProfile ?? (type === 'swarm' ? 'swarm-cluster' : 'standard'),
    isMaskedAsCivilian: model.isMaskedAsCivilian ?? false,
    maskedCallsign: model.maskedCallsign,
    apparentRCS: model.apparentRCS,
    trueMicroDoppler: model.trueMicroDoppler,
    unmasked: false,
    isFiberOptic: model.isFiberOptic ?? false,
    isTransit,
    transitDestinationName: isTransit && transitTarget ? transitTarget.name : undefined,
    batteryStation,
  };
}

// ── Countermeasure logic ──────────────────────────────────────────────────────
export function getCorrectCountermeasure(type: ThreatType, intent: Intent, isFiberOptic = false): CountermeasureType {
  if (intent === 'neutral' || intent === 'friendly') return 'alert-evacuate';
  if (isFiberOptic) return 'laser-dew';               // Optical fiber immune to RF/GNSS; laser burns tether & airframe
  if (type === 'commercial') return 'rf-jammer';      // GPS/RF jamming cuts comms link
  if (type === 'military')   return 'interceptor';    // Hard-kill: interceptor drone / missile
  return 'ew';                                         // Swarm: electronic warfare to blind them all
}

/** Accepts both primary and alternate doctrine countermeasures per threat class. */
export function isValidCountermeasure(type: ThreatType, intent: Intent, cm: CountermeasureType, isFiberOptic = false): boolean {
  if (intent === 'neutral' || intent === 'friendly') return cm === 'alert-evacuate';
  if (isFiberOptic) return cm === 'laser-dew' || cm === 'interceptor'; // Immune to soft-kill RF/GNSS!
  if (type === 'commercial') return cm === 'rf-jammer' || cm === 'gnss-spoof';
  if (type === 'military')   return cm === 'interceptor' || cm === 'laser-dew';
  if (type === 'swarm')      return cm === 'ew';
  return false;
}

export function getDifficultyConfig(difficulty: Difficulty) {
  return DIFFICULTY_CONFIG[difficulty];
}
