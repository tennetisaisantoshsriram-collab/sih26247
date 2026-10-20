const fs = require('fs');
const path = require('path');

const levelsPath = path.join(__dirname, '..', 'lib', 'levels.ts');
let content = fs.readFileSync(levelsPath, 'utf8');

// Modern threat archetypes referencing global military counter-UAS doctrines
const ARCHETYPES = [
  {
    type: 'civilian-masked',
    threatName: 'Civilian-Masked Cargo Infiltrator (ADS-B Mode-S Transponder Cloaked)',
    tactics: 'flying within civil air corridor under forged Mode-S squawk 1200 / callsign CARGO-EXP 992 (apparent RCS 34.2 m²) to deter kinetic release',
    detection: 'Interrogate Micro-Doppler FFT rotor blade harmonics to isolate multi-rotor modulation from civil turbofan returns; verify MWIR thermal exhaust signature',
    kill: 'Peel off civilian mask via sensor fusion, confirm hostile classification, and deploy precision 10kW Laser DEW [Y] or GNSS Cyber-Spoof [T] outside populated zone (NATO Drone Dome doctrine)'
  },
  {
    type: 'fiber-optic-fpv',
    threatName: '10km Fiber-Optic Spooled Kamikaze FPV (FO-10 Spool — 100% Jamming Immune)',
    tactics: 'nap-of-the-earth terrain hugging at 18m AGL unspooling micro-filament glass tether with ZERO wireless RF emissions, completely immune to RF jammer and GNSS spoofing',
    detection: 'Triangulate via Acoustic Phased Array blade-pass harmonics and FMCW 3D gapfiller Doppler track; optical micro-tether tracking on FLIR',
    kill: 'Soft-kill RF/GNSS has 0% P_k! Fire 10kW High-Energy Laser DEW [Y] to thermalize and sever optical fiber and composite chassis in <1.2s, or launch Kinetic SAM Interceptor [W] (Ukraine/Israel EW lesson)'
  },
  {
    type: 'turbojet-cruise',
    threatName: 'Shahed-238 Micro-Turbojet High-Speed Kamikaze Cruise UAS',
    tactics: 'high-velocity sprint at 480 km/h with 1.9x terminal dive acceleration targeting critical base infrastructure, radar radomes, and ammunition dispersal pens',
    detection: 'Track intensive MWIR/LWIR turbine exhaust plume (>550°C) and lock high radial Doppler gate (Vr > 110 m/s) on AESA fire-control radar',
    kill: 'Engage via Akash-NG / QRSAM SAM Battery Launcher [W] with active AESA millimeter-wave radar homing from designated battery coordinates, or 10kW Laser DEW [Y] before 15km perimeter (US Army M-SHORAD doctrine)'
  },
  {
    type: 'insectoid-spy',
    threatName: 'Biomimetic Insectoid Nano-Spy Drone (Hornet-Nano Sub-10cm Recon Probe)',
    tactics: 'flapping-wing micro-rotor infiltration exploiting ultra-low RCS (<0.0001 m²) to penetrate hangar perimeters, ammunition storage bunkers, and radar masts for covert wiretapping',
    detection: 'High-frequency Acoustic Array cross-correlation (isolating 85 Hz flapping harmonic) cross-checked with ultra-sensitive millimeter-wave Ku-band gapfiller radar',
    kill: 'Deploy focused 10kW Laser DEW Turret [Y] to blind optical sensor and thermalize micro-actuators in 0.8s, or localized Directional RF Jammer [Q] on 2.4 GHz video downlink (US/UK Black Hornet counter-tactics)'
  },
  {
    type: 'hale-sigint',
    threatName: 'Strategic High-Altitude SIGINT/ELINT Spy UAS (WZ-7 Soaring Dragon Class)',
    tactics: 'high-altitude long-endurance standoff orbit at 14,000m ASL mapping electronic order of battle, radar frequencies, and tropospheric communications links',
    detection: 'Multi-spectral FLIR boundary-layer friction heat detection combined with long-range bi-static air surveillance radar feed',
    kill: 'Verify IFF Mode-5 crypto on friendly air traffic [R]; engage hostile high-altitude spy UCAV with long-range Akash-NG SAM Battery [W] outside 75km exclusion boundary'
  },
  {
    type: 'autonomous-swarm',
    threatName: 'Autonomous TDMA Encrypted Mesh Swarm (CH-901 Micro-Loitering Cluster)',
    tactics: 'coordinated 868 MHz TDMA encrypted swarm nodes executing multi-axis perimeter saturation to exhaust single-target air defense missile magazines',
    detection: 'Wideband RF spectrum waterfall analysis detecting frequency-hopping mesh sync pulses; multi-track 3D gapfiller clustering',
    kill: 'Deploy Broadband High-Power Microwave (HPM) Array [E] radiating gigawatt pulses to couple into internal circuitry and collapse mesh synchronization, or individual sequential laser burn [Y] (US THOR / DRDO HPM doctrine)'
  },
  {
    type: 'canyon-weave',
    threatName: 'Terrain-Contour Canyon-Weaving Multirotor Infiltrator',
    tactics: 'lateral zig-zag weaving (〰 WEAVE) at 22m AGL through river gorges and ravine dead-zones below ground radar horizon to deliver magnetic shaped-charge IEDs',
    detection: 'Downward-tilted Pulse-Doppler filtering to reject ground multipath clutter; perimeter acoustic arrays tracking rotor harmonics',
    kill: 'Inject GNSS Cyber-Spoofing [T] to transmit false altitude offsets and force controlled quarantine landing, or neutralize with Directional RF Jammer [Q]'
  },
  {
    type: 'fratricide-deconfliction',
    threatName: 'Covert Standoff Munition Shadowing Friendly IAF / Commercial Air Corridor',
    tactics: 'hostile loitering munition shadowing the glide-slope and approach corridor of friendly IAF transport / civil airliners to force collateral fratricide',
    detection: 'Mandatory Mode-5 IFF Level-2 cryptographic interrogation and SSR Mode-S transponder handshake on all corridor tracks',
    kill: 'STRICT ZERO-FRATRICIDE ROE: Clear friendly transport with Safe Corridor [R]; engage confirmed hostile parasite with precision non-explosive 10kW Laser DEW [Y] or GNSS Spoof [T]'
  }
];

// Split content by blueprint blocks
// Each blueprint block starts with `  {` and has `opName: "..."`
const blockRegex = /\{\s*opName:\s*"([^"]+)",[\s\S]*?targetName:\s*"([^"]+)",[\s\S]*?targetLat:\s*([0-9.-]+),[\s\S]*?targetLng:\s*([0-9.-]+),[\s\S]*?hasFriendlyCorridor:\s*(true|false),[\s\S]*?scenario:\s*"([^"]*)",[\s\S]*?briefing:\s*"([^"]*)"[\s\S]*?\}/g;

let count = 0;
content = content.replace(blockRegex, (match, opName, targetName, targetLat, targetLng, hasFriendly, oldScenario, oldBriefing) => {
  count++;
  const arch = ARCHETYPES[(count - 1) % ARCHETYPES.length];
  const isFriendlyCorridor = hasFriendly === 'true' || arch.type === 'fratricide-deconfliction';

  let newScenario = '';
  let newBriefing = '';

  if (isFriendlyCorridor && count % 3 === 0) {
    newScenario = `REAL-TIME AIR-CORRIDOR INTRUSION at ${targetName}. Hostile strike UAS cloaked under civil transponder squawk (Mode-S 1200 / B777 disguise, apparent RCS 34m²) shadowing civil glide-slope. Requires positive sensor fusion discrimination before weapons release.`;
    newBriefing = `${opName} AIR-DEFENSE ORDER. STRICT ROE: Verify Mode-5 IFF on friendly/civil airliners [R]. Interrogate Micro-Doppler FFT rotor harmonics to de-mask hostile drone; neutralize with precision 10kW Laser DEW [Y] or GNSS Spoof [T] without kinetic debris.`;
  } else if (arch.type === 'fiber-optic-fpv') {
    newScenario = `Low-level riverbed/ravine incursion at ${targetName} by 10km Fiber-Optic Spooled Kamikaze FPVs (FO-10 Spool). Drones unspool micro-filament glass tether at 20m AGL with zero wireless RF emission, rendering them 100% immune to RF jamming.`;
    newBriefing = `${opName} FIRE-CONTROL ORDER. WARNING: Fiber-optic FPVs ignore RF Jammer [Q] and GNSS Spoof [T]! Firing solution must deploy 10kW High-Energy Laser DEW Turret [Y] to burn optical tether in <1.2s or launch Kinetic Interceptor [W] from base battery coordinates.`;
  } else if (arch.type === 'turbojet-cruise') {
    newScenario = `High-speed Shahed-238 micro-turbojet cruise UAS incursion targeting ${targetName}. Targets cruising at 480 km/h initiating terminal 1.9x dive sprint (⚡ DIVE) against hardened shelters and fuel storage tanks.`;
    newBriefing = `${opName} TERMINAL SPRINT ALERT. Track turbojet MWIR exhaust plume (>550°C) and high radial Doppler gate. Engage immediately with Akash-NG / QRSAM SAM Battery Launcher [W] or 10kW Laser DEW [Y] outside 20km base perimeter.`;
  } else if (arch.type === 'insectoid-spy') {
    newScenario = `Covert deep-penetration probe at ${targetName}. Sub-10cm biomimetic insectoid nano-spy drones (Hornet-Nano, RCS < 0.0001 m²) attempting to infiltrate hangar doors and radar command bunkers for optical/acoustic wiretapping.`;
    newBriefing = `${opName} NANO-UAV INTERDICTION. Nano-spy drones invisible to standard radar. Cross-correlate Acoustic Array 85 Hz flapping harmonics with FMCW 3D gapfiller radar. Thermalize airframe with focused 10kW Laser DEW [Y] or localized Directional RF Jammer [Q].`;
  } else if (arch.type === 'civilian-masked') {
    newScenario = `Transponder-spoofing incursion approaching ${targetName}. Hostile drone formation cloaked under forged civil cargo callsign (CARGO-EXP 992 / IL-76 disguise, apparent RCS 32m²) along international air route.`;
    newBriefing = `${opName} RADAR-MASKING ENGAGEMENT. Interrogate Micro-Doppler rotor blade harmonics to peel off civilian cargo disguise. Once hostile identity is confirmed, divert with GNSS Cyber-Spoof [T] or neutralize with 10kW Laser DEW [Y].`;
  } else if (arch.type === 'autonomous-swarm') {
    newScenario = `Coordinated 868 MHz TDMA encrypted mesh swarm (CH-901 loitering cluster) launched against ${targetName} to saturate air defense radars with multi-vector ingress.`;
    newBriefing = `${opName} SWARM DEFENSE ORDER. Multi-node mesh formation detected on wideband RF waterfall. Rapid individual triage required: acquire, verify, and neutralize each swarm node with Broadband EMP EW Suite [E] or precision Laser DEW [Y].`;
  } else if (arch.type === 'hale-sigint') {
    newScenario = `High-altitude strategic SIGINT/ELINT spy UAS (WZ-7 Soaring Dragon class) orbiting at 14,000m ASL above ${targetName} mapping electronic order of battle and air defense radar frequencies.`;
    newBriefing = `${opName} HIGH-ALTITUDE SPY PROBE. Track boundary-layer friction heat via multi-spectral FLIR. Confirm absent Mode-5 IFF and engage hostile strategic spy UAS with long-range Akash-NG SAM Battery [W] outside 75km exclusion envelope.`;
  } else {
    newScenario = `Terrain-following nap-of-the-earth multirotor incursion weaving laterally (〰 WEAVE) at 25m AGL through terrain dead-zones toward ${targetName} to deliver shaped-charge munitions.`;
    newBriefing = `${opName} LOW-ALTITUDE INTERCEPT. Target weaves below radar horizon. Downward Pulse-Doppler filtering and acoustic array confirm hostile tracking; divert via GNSS Cyber-Spoof [T] or neutralize with Directional RF Jammer [Q].`;
  }

  // Preserve the rest of the block and replace scenario and briefing
  let res = match.replace(/scenario:\s*"[^"]*"/, `scenario: "${newScenario}"`);
  res = res.replace(/briefing:\s*"[^"]*"/, `briefing: "${newBriefing}"`);
  return res;
});

console.log('Total blueprints updated:', count);
fs.writeFileSync(levelsPath, content, 'utf8');
console.log('Successfully written to lib/levels.ts');
