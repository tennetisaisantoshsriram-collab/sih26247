import { CountermeasureType, Threat, Weather } from '@/types';

export interface PkWezSolution {
  pk: number; // 0 to 100
  status: 'OPTIMAL' | 'EFFECTIVE' | 'MARGINAL' | 'DEGRADED' | 'PROHIBITED';
  wezEnvelope: string;
  distanceKm: number;
  ttiSec: number;
  tacticalNote: string;
  color: string;
  // Authentic defense system firing station telemetry
  batteryStation?: {
    name: string;
    lat: number;
    lng: number;
  };
  targetCoords?: {
    lat: number;
    lng: number;
    altM: number;
  };
  slantRangeKm?: number;
  launchAzimuthDeg?: number;
  elevationDeg?: number;
  timeOfFlightSec?: number;
}

export function calculatePkAndWez(
  cm: CountermeasureType,
  threat: Threat,
  weather?: Weather | string
): PkWezSolution {
  const distDeg = Math.sqrt((threat.targetLat - threat.lat) ** 2 + (threat.targetLng - threat.lng) ** 2);
  const distKm = parseFloat((distDeg * 111).toFixed(1));
  const ttiSec = threat.speed > 0 ? Math.max(1, Math.round((distDeg / threat.speed) * 0.2)) : 99;

  // Exact defending air-defense battery mount
  const batStation = threat.batteryStation ?? {
    name: cm === 'interceptor' ? 'Akash-NG / QRSAM SAM Battery Launcher' :
          cm === 'laser-dew' ? '10kW High-Energy Laser DEW Turret #1' :
          cm === 'ew' ? 'Broadband High-Power Microwave (HPM) Array' :
          cm === 'gnss-spoof' ? 'Tactical GNSS Spoofing Ground Station' :
          'D-4 Directional RF High-Gain Jammer Mast',
    lat: threat.targetLat + (cm === 'interceptor' ? -0.0035 : cm === 'laser-dew' ? 0.0028 : cm === 'ew' ? -0.0022 : 0.0045),
    lng: threat.targetLng + (cm === 'interceptor' ? 0.0055 : cm === 'laser-dew' ? -0.0042 : cm === 'ew' ? -0.0035 : 0.0038),
  };

  const dLatB = threat.lat - batStation.lat;
  const dLngB = threat.lng - batStation.lng;
  const launchAzimuthDeg = Math.round(((Math.atan2(dLngB, dLatB) * 180 / Math.PI) + 360) % 360);
  const altDiffKm = Math.max(0, (threat.altitude - 50) / 1000);
  const slantRangeKm = parseFloat(Math.sqrt(distKm ** 2 + altDiffKm ** 2).toFixed(2));
  const elevationDeg = Math.round((Math.atan2(altDiffKm, Math.max(0.1, distKm)) * 180) / Math.PI);

  const effectorSpeedKmS =
    cm === 'laser-dew' ? 299792 :
    cm === 'interceptor' ? 1.02 : // Mach 3
    cm === 'ew' || cm === 'rf-jammer' || cm === 'gnss-spoof' ? 299792 : 0.5;
  const timeOfFlightSec = parseFloat(Math.max(0.1, slantRangeKm / (effectorSpeedKmS === 299792 ? 299792 : 1.02)).toFixed(1));

  let pk = 80;
  let status: PkWezSolution['status'] = 'EFFECTIVE';
  let tacticalNote = '';
  let color = '#22c55e';
  let wezEnvelope = 'WITHIN OPTIMAL WEZ';

  const wx = weather || 'clear';

  // ── SPECIAL THREAT WARFARE PARADIGMS ──
  // 1. Fiber-Optic Guided FPV (100% Jamming Immune)
  if (threat.isFiberOptic) {
    if (cm === 'rf-jammer' || cm === 'gnss-spoof') {
      return {
        pk: 0, status: 'PROHIBITED', wezEnvelope: 'IMMUNE TO RF',
        distanceKm: distKm, ttiSec, color: '#ef4444',
        tacticalNote: 'IMMUNE: Guided by spooled optical micro-fiber! No wireless RF or GNSS link exists. Neutralize via Laser DEW [Y] or Kinetic SAM [W]!',
        batteryStation: batStation, targetCoords: { lat: threat.lat, lng: threat.lng, altM: threat.altitude },
        slantRangeKm, launchAzimuthDeg, elevationDeg, timeOfFlightSec,
      };
    }
  }

  // 2. Transponder-Masked Infiltration (Civilian Cargo Disguise)
  if (threat.isMaskedAsCivilian && !threat.unmasked && cm !== 'alert-evacuate') {
    tacticalNote = `⚠ RADAR MASK: Target displaying Mode-S transponder '${threat.maskedCallsign || 'Airliner'}'. Verify Micro-Doppler in EO/IR panel before kinetic release! `;
  }

  switch (cm) {
    case 'rf-jammer':
      if (threat.type === 'commercial') {
        pk = 94;
        status = 'OPTIMAL';
        tacticalNote = 'Severed 2.4/5.8GHz ISM C2 link; drone triggers fail-safe hover/RTH';
        color = '#22c55e';
      } else if (threat.type === 'military') {
        pk = 18;
        status = 'DEGRADED';
        tacticalNote = 'Ineffective: Military UCAV utilizes encrypted satellite link & FHSS ECCM';
        color = '#ef4444';
      } else if (threat.type === 'swarm') {
        pk = 48;
        status = 'MARGINAL';
        tacticalNote = 'Partial degradation: Swarm TDMA mesh reroutes around jammed nodes';
        color = '#f59e0b';
      } else {
        pk = 10;
        status = 'PROHIBITED';
        tacticalNote = 'Civilian transponder unresponsive to tactical RF jamming';
        color = '#64748b';
      }
      if (distKm > 4.0) {
        pk = Math.round(pk * 0.5);
        wezEnvelope = 'OUTER RANGE (SIGNAL FALLOFF)';
      }
      break;

    case 'gnss-spoof':
      if (threat.type === 'commercial') {
        pk = 92;
        status = 'OPTIMAL';
        tacticalNote = 'Civil L1/L5 GPS spoofed; target captured & diverted to Quarantine LZ';
        color = '#06b6d4';
      } else if (threat.type === 'military') {
        pk = 32;
        status = 'DEGRADED';
        tacticalNote = 'Mil-grade INS and optical terrain-matching bypasses false GNSS coords';
        color = '#ef4444';
      } else if (threat.type === 'swarm') {
        pk = 54;
        status = 'MARGINAL';
        tacticalNote = 'Desynchronizes swarm clock, but inter-node ranging maintains formation';
        color = '#f59e0b';
      } else {
        pk = 0;
        status = 'PROHIBITED';
        tacticalNote = 'Hazardous: Do not spoof civilian aircraft navigation!';
        color = '#ef4444';
      }
      break;

    case 'interceptor':
      if (threat.type === 'military') {
        pk = 96;
        status = 'OPTIMAL';
        tacticalNote = 'Direct kinetic kill: Proximity fragmentation fuse splatters UCAV airframe';
        color = '#22c55e';
      } else if (threat.type === 'commercial') {
        pk = 88;
        status = 'EFFECTIVE';
        tacticalNote = 'Small RCS (<0.02m²) target; proximity blast ensures structural kill';
        color = '#22c55e';
      } else if (threat.type === 'swarm') {
        pk = 32;
        status = 'DEGRADED';
        tacticalNote = 'Severe Munition Inefficiency: Single missile destroys only 1 of N swarm nodes';
        color = '#f59e0b';
      }
      if (distKm < 0.5) {
        pk = Math.round(pk * 0.4);
        wezEnvelope = 'MINIMUM ABORT (TOO CLOSE FOR SAM)';
      }
      break;

    case 'laser-dew':
      pk = threat.type === 'military' ? 91 : 98;
      if (wx === 'foggy') {
        pk = 34;
        status = 'DEGRADED';
        tacticalNote = 'Atmospheric beam scatter: Dense fog causes severe 10kW laser thermal defocus';
        color = '#ef4444';
      } else if (wx === 'dust-storm') {
        pk = 30;
        status = 'DEGRADED';
        tacticalNote = 'Particulate absorption: Airborne sand absorbs directed optical energy';
        color = '#ef4444';
      } else if (wx === 'rainy') {
        pk = 62;
        status = 'MARGINAL';
        tacticalNote = 'Water droplet diffraction reduces thermal flux on target skin';
        color = '#f59e0b';
      } else {
        status = 'OPTIMAL';
        tacticalNote = 'Clear atmospheric window: High thermal flux burns motor/rotor hub in <1.2s';
        color = '#22c55e';
      }
      if (distKm > 2.5) {
        pk = Math.round(pk * 0.4);
        wezEnvelope = 'BEYOND LASER FOCAL LENGTH (>2.5km)';
      }
      break;

    case 'ew':
      if (threat.type === 'swarm') {
        pk = 99;
        status = 'OPTIMAL';
        tacticalNote = 'DRDO SWM-2024 Doctrine: Broadband HPM pulse burns receiver ICs across entire cluster';
        color = '#a855f7';
      } else if (threat.type === 'commercial') {
        pk = 92;
        status = 'OPTIMAL';
        tacticalNote = 'High-power microwave pulse permanently disables flight controller';
        color = '#22c55e';
      } else if (threat.type === 'military') {
        pk = 76;
        status = 'EFFECTIVE';
        tacticalNote = 'Broadband electromagnetic interference induces flight control reboot';
        color = '#3b82f6';
      }
      break;

    case 'alert-evacuate':
      if (threat.intent !== 'hostile') {
        pk = 100;
        status = 'OPTIMAL';
        tacticalNote = 'Strict ROE compliance: 0% fratricide penalty; airspace surveillance maintained';
        color = '#22c55e';
      } else {
        pk = 0;
        status = 'PROHIBITED';
        tacticalNote = 'Tactical Failure: Passive hold-fire against confirmed hostile causes base breach!';
        color = '#ef4444';
      }
      break;
  }

  return {
    pk: Math.max(0, Math.min(100, pk)),
    status,
    wezEnvelope,
    distanceKm: distKm,
    ttiSec,
    tacticalNote,
    color,
    batteryStation: batStation,
    targetCoords: { lat: threat.lat, lng: threat.lng, altM: threat.altitude },
    slantRangeKm,
    launchAzimuthDeg,
    elevationDeg,
    timeOfFlightSec,
  };
}
