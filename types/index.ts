export type Difficulty = 'easy' | 'medium' | 'hard';

export type ThreatType = 'commercial' | 'military' | 'swarm';
export type Intent = 'hostile' | 'neutral' | 'friendly';
export type CountermeasureType =
  | 'rf-jammer'
  | 'gnss-spoof'
  | 'interceptor'
  | 'laser-dew'
  | 'ew'
  | 'alert-evacuate';
export type GamePhase = 'playing' | 'detecting' | 'classifying' | 'ended';
export type Environment = 'open' | 'urban' | 'mountain' | 'coastal' | 'critical-infrastructure';
export type Weather = 'clear' | 'foggy' | 'rainy' | 'dust-storm';

export interface Threat {
  id: string;
  type: ThreatType;
  intent: Intent;
  lat: number;
  lng: number;
  targetLat: number;
  targetLng: number;
  spawnedAt: number;
  speed: number;
  isDecoy: boolean;
  neutralized: boolean;
  detected: boolean;       // false = unknown radar blip; true = acquired/tracked
  breached: boolean;       // true = reached target without operator classification
  modelName: string;
  origin: string;
  wingspan: string;
  maxSpeed: string;
  payload: string;
  range: string;
  threatRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  altitude: number;
  heading: number;
  // Flight profile & advanced warfare techniques
  flightProfile?: 'standard' | 'stealth-ghost' | 'kamikaze-sprint' | 'zigzag-evasive' | 'swarm-cluster' | 'masked-cargo-flight' | 'fiber-optic-tether' | 'terrain-contour';
  isGhosting?: boolean;
  sprintActive?: boolean;
  // Radar & Transponder Masking (drone/swarm disguised as civilian cargo airliner)
  isMaskedAsCivilian?: boolean;
  maskedCallsign?: string;
  apparentRCS?: string;
  trueMicroDoppler?: string;
  unmasked?: boolean;
  // Fiber-Optic Guided FPV (100% RF jamming immune)
  isFiberOptic?: boolean;
  // Cross-sector transit threat (e.g. crossing Pathankot airspace enroute to Adampur)
  isTransit?: boolean;
  transitDestinationName?: string;
  // Firing battery assigned to defend against this threat
  batteryStation?: { name: string; lat: number; lng: number };
  // Path replay
  path: Array<{ lat: number; lng: number; t: number }>;
}

export interface Decision {
  threatId: string;
  threatType: ThreatType;
  intent: Intent;
  classifiedAs: ThreatType;
  classifiedIntent: Intent;
  countermeasure: CountermeasureType;
  correct: boolean;
  responseTimeMs: number;
  timestamp: number;
  detectionTimeMs: number;  // time from spawn to first click (detect)
  modelName?: string;       // drone model name (e.g. "Burraq UCAV")
  // Firing Battery & Target Intercept Coordinates (real-world ballistics)
  batteryLat?: number;
  batteryLng?: number;
  batteryName?: string;
  interceptLat?: number;
  interceptLng?: number;
  slantRangeKm?: number;
  // Trajectory replay
  path: Array<{ lat: number; lng: number; t: number }>;
  spawnLat: number;
  spawnLng: number;
  // AI tracking
  aiSuggestedType?: ThreatType;
  aiSuggestedIntent?: Intent;
  aiSuggestedCountermeasure?: CountermeasureType;
  followedAI?: boolean;
}

export interface ScriptedEvent {
  delayMs: number;        // ms after mission start to spawn this threat
  type: ThreatType;
  intent: Intent;
  bearing: number;        // compass degrees (0=N, 90=E, 180=S, 270=W)
  altitudeM: number;      // AGL metres
}

export interface Session {
  id: string;
  difficulty: Difficulty;
  level: number;
  score: number;
  startedAt: number;
  endedAt: number;
  decisions: Decision[];
  breachCount?: number;    // threats that reached the base
  baseHealth?: number;     // 0–100 final asset integrity
  profileId?: string;      // active profile ID at time of session
  operatorName?: string;   // trainee name for unit roster
  unit?: string;           // unit for roster grouping
}
