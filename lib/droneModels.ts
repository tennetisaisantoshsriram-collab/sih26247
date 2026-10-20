import { ThreatType } from '@/types';

export interface DroneModel {
  name: string;
  origin: string;
  wingspan: string;
  maxSpeed: string;
  payload: string;
  range: string;
  threat: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  image: string;
  flightProfile?: 'standard' | 'stealth-ghost' | 'kamikaze-sprint' | 'zigzag-evasive' | 'swarm-cluster' | 'masked-cargo-flight' | 'fiber-optic-tether' | 'terrain-contour';
  isMaskedAsCivilian?: boolean;
  maskedCallsign?: string;
  apparentRCS?: string;
  trueMicroDoppler?: string;
  isFiberOptic?: boolean;
}

// ── Commercial / Surveillance drones (Pakistan-sourced, used across LoC/IB) ──
const COMMERCIAL_DRONES: DroneModel[] = [
  {
    name: 'DJI Mavic 2 Pro (Modified)',
    origin: 'Pakistan (Chinese airframe)',
    wingspan: '29 cm', maxSpeed: '72 km/h', payload: '1.5 kg', range: '18 km',
    threat: 'MEDIUM', image: '🟡',
  },
  {
    name: 'DJI Phantom 4 (Payload-converted)',
    origin: 'Pakistan (LeT/JeM cell)',
    wingspan: '35 cm', maxSpeed: '70 km/h', payload: '1.2 kg', range: '7 km',
    threat: 'LOW', image: '🟡',
  },
  {
    name: 'Hexacopter Smuggler-X',
    origin: 'Pakistan (ISI-procured)',
    wingspan: '60 cm', maxSpeed: '65 km/h', payload: '3 kg', range: '10 km',
    threat: 'MEDIUM', image: '🟡',
  },
  {
    name: 'DJI Agras T30 (Repurposed)',
    origin: 'Pakistan (agricultural converted)',
    wingspan: '178 cm', maxSpeed: '54 km/h', payload: '30 kg', range: '7 km',
    threat: 'HIGH', image: '🟡', flightProfile: 'zigzag-evasive',
  },
  {
    name: 'FPV Kamikaze Racing Quad',
    origin: 'Pakistan (ISI-modified racing drone)',
    wingspan: '22 cm', maxSpeed: '140 km/h', payload: '1.8 kg Shaped Charge', range: '5 km',
    threat: 'HIGH', image: '🟡', flightProfile: 'kamikaze-sprint',
  },
  {
    name: 'Fiber-Optic Kamikaze FPV (FO-10 Spool)',
    origin: 'Hostile Infiltration (10km Optical Fiber Spool — 100% Jamming Immune)',
    wingspan: '24 cm', maxSpeed: '160 km/h', payload: '2.5 kg PG-7VR Tandem Warhead', range: '10 km',
    threat: 'CRITICAL', image: '🟡', flightProfile: 'fiber-optic-tether', isFiberOptic: true,
  },
  {
    name: 'Civilian-Masked Cargo Infiltrator (B777 Disguise)',
    origin: 'Hostile Infiltration (ADS-B Mode-S Transponder Spoofing)',
    wingspan: '3.2 m (Cluster Formation)', maxSpeed: '210 km/h', payload: '40 kg High Explosive Sabotage Pack', range: '450 km',
    threat: 'CRITICAL', image: '🟡', flightProfile: 'masked-cargo-flight',
    isMaskedAsCivilian: true, maskedCallsign: 'AIC-412 (B777 Heavy Cargo)',
    apparentRCS: '34.2 m² (Civilian Cargo Jet)', trueMicroDoppler: '4x Electric Motor Harmonics (Swarm)',
  },
  {
    name: 'Biomimetic Insectoid Spy Drone (Hornet-Nano)',
    origin: 'Covert Deep-Infiltration Operative (Sub-10cm Flapping-Wing / Nano-Rotor)',
    wingspan: '10 cm (Insectoid)', maxSpeed: '42 km/h', payload: '25g Micro-FLIR & Audio Wiretap', range: '2.5 km',
    threat: 'HIGH', image: '🟡', flightProfile: 'terrain-contour',
    apparentRCS: '0.0001 m² (Insect/Bat Profile)', trueMicroDoppler: 'Flapping Harmonic Spikes (85 Hz)',
  },
];

// ── Military-grade UCAVs (Pakistan + China PLA) ──
const MILITARY_DRONES: DroneModel[] = [
  {
    name: 'Burraq UCAV',
    origin: 'Pakistan Air Force',
    wingspan: '3 m', maxSpeed: '230 km/h', payload: '50 kg', range: '1500 km',
    threat: 'CRITICAL', image: '🔴', flightProfile: 'zigzag-evasive',
  },
  {
    name: 'Shahpar-III',
    origin: 'Pakistan Air Force',
    wingspan: '4.5 m', maxSpeed: '222 km/h', payload: '50 kg', range: '800 km',
    threat: 'HIGH', image: '🔴',
  },
  {
    name: 'CH-4B Rainbow',
    origin: 'China (PLAAF)',
    wingspan: '18 m', maxSpeed: '235 km/h', payload: '345 kg', range: '3500 km',
    threat: 'CRITICAL', image: '🔴',
  },
  {
    name: 'TB001 Twin-Tailed Scorpion',
    origin: 'China (PLAAF)',
    wingspan: '10 m', maxSpeed: '200 km/h', payload: '100 kg', range: '2000 km',
    threat: 'CRITICAL', image: '🔴',
  },
  {
    name: 'GJ-2 Wing Loong II',
    origin: 'China (PLAAF)',
    wingspan: '20.5 m', maxSpeed: '340 km/h', payload: '400 kg', range: '4000 km',
    threat: 'CRITICAL', image: '🔴',
  },
  {
    name: 'WZ-7 Soaring Dragon',
    origin: 'China (PLAAF, ISR)',
    wingspan: '25 m', maxSpeed: '750 km/h', payload: '200 kg', range: '7000 km',
    threat: 'HIGH', image: '🔴',
  },
  {
    name: 'GJ-11 Sharp Sword (Stealth UCAV)',
    origin: 'China (PLAAF — stealth flying-wing)',
    wingspan: '14 m', maxSpeed: '680 km/h', payload: '200 kg Internal Bay', range: '4000 km',
    threat: 'CRITICAL', image: '🔴', flightProfile: 'stealth-ghost',
  },
  {
    name: 'Harop / Shahed-136 Loitering Munition',
    origin: 'Pakistan / Iran (ISI-procured loitering munition)',
    wingspan: '2.5 m', maxSpeed: '185 km/h', payload: '40 kg Warhead', range: '1000 km',
    threat: 'CRITICAL', image: '🔴', flightProfile: 'kamikaze-sprint',
  },
  {
    name: 'Shahed-238 Turbojet Cruise UAS',
    origin: 'Hostile Strike Cell (Micro-Turbojet Engine — High-Speed Kamikaze)',
    wingspan: '2.8 m', maxSpeed: '520 km/h', payload: '50 kg Blast Fragmentation', range: '800 km',
    threat: 'CRITICAL', image: '🔴', flightProfile: 'kamikaze-sprint',
  },
  {
    name: 'IL-76 Masked Multi-UAV Cluster',
    origin: 'Strategic Air Corridor Intrusion (Civil Transponder Disguise)',
    wingspan: '6.5 m (Stacked Ingress)', maxSpeed: '240 km/h', payload: '80 kg Munitions Dispenser', range: '1200 km',
    threat: 'CRITICAL', image: '🔴', flightProfile: 'masked-cargo-flight',
    isMaskedAsCivilian: true, maskedCallsign: 'AFG-701 (IL-76 Heavy Transport)',
    apparentRCS: '48.0 m² (Widebody Cargo Transport)', trueMicroDoppler: 'Coordinated Jet-Turbine + Drone Propeller Modulation',
  },
];

// ── Swarm drones (China PLA swarm + Pakistan proxy) ──
const SWARM_DRONES: DroneModel[] = [
  {
    name: 'PLAAF Swarm Node Mk-2',
    origin: 'China (PLA swarm program)',
    wingspan: '30 cm', maxSpeed: '120 km/h', payload: '0.3 kg', range: '15 km',
    threat: 'CRITICAL', image: '🟣', flightProfile: 'swarm-cluster',
  },
  {
    name: 'ISI Micro-Swarm Unit',
    origin: 'Pakistan (proxy cell)',
    wingspan: '20 cm', maxSpeed: '90 km/h', payload: '0.2 kg', range: '8 km',
    threat: 'HIGH', image: '🟣', flightProfile: 'swarm-cluster',
  },
  {
    name: 'Loitering Munition Type-K',
    origin: 'Unknown (sea-borne delivery)',
    wingspan: '45 cm', maxSpeed: '150 km/h', payload: '1 kg', range: '50 km',
    threat: 'CRITICAL', image: '🟣', flightProfile: 'swarm-cluster',
  },
  {
    name: 'Kamikaze Nano-UAV',
    origin: 'Pakistan (ISI-funded)',
    wingspan: '15 cm', maxSpeed: '100 km/h', payload: '0.5 kg', range: '5 km',
    threat: 'HIGH', image: '🟣', flightProfile: 'swarm-cluster',
  },
  {
    name: 'CH-901 Mesh Swarm (Autonomous Cluster)',
    origin: 'China (PLA Tactical Swarm with DRDO Mesh Dissociation Target)',
    wingspan: '1.2 m', maxSpeed: '180 km/h', payload: '3.5 kg HEAT Warhead', range: '35 km',
    threat: 'CRITICAL', image: '🟣', flightProfile: 'swarm-cluster',
  },
  {
    name: 'Civilian Corridor Air-Drop Swarm',
    origin: 'Covert Cargo Air Release (Bypasses Outer Radar Net)',
    wingspan: '40 cm', maxSpeed: '140 km/h', payload: '1.2 kg Shaped Charge', range: '25 km',
    threat: 'CRITICAL', image: '🟣', flightProfile: 'masked-cargo-flight',
    isMaskedAsCivilian: true, maskedCallsign: 'CARGO-EXP 992',
    apparentRCS: '28.5 m² (Pre-Separation Cluster)', trueMicroDoppler: '8x Coordinated Rotor Blades',
  },
];

export function getRandomDroneModel(type: ThreatType): DroneModel {
  const pool =
    type === 'commercial' ? COMMERCIAL_DRONES :
    type === 'military'   ? MILITARY_DRONES :
    SWARM_DRONES;
  return pool[Math.floor(Math.random() * pool.length)];
}
