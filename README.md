<div align="center">

# DroneShield — AI-Enabled C-UAS Simulation Trainer

### Smart India Hackathon 2026 · PS26247 · Ministry of Defence

[![Live Demo](https://img.shields.io/badge/Live%20Demo-sih26247.vercel.app-0070C0?style=for-the-badge&logo=vercel&logoColor=white)](https://sih26247.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Groq AI](https://img.shields.io/badge/Groq%20AI-llama--3.1--8b-F55036?style=for-the-badge)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> **Browser-based Counter-UAS training simulator for IAF, Army Air Defence, and Navy operators — powered by real Indian geography, 23 adversary drone models, IAF doctrine, and Groq AI.**

![125 Missions](https://img.shields.io/badge/125%20Missions-5%20Operational%20Tiers-1F3964?style=flat-square) &nbsp;
![23 Drones](https://img.shields.io/badge/23%20Adversary%20Drones-Pakistan%20%2B%20China%20PLAAF-C00000?style=flat-square) &nbsp;
![Zero Install](https://img.shields.io/badge/Zero%20Server-100%25%20Browser--Based-00B050?style=flat-square)

</div>

---

## Overview

DroneShield is a fully functional, browser-based Counter-UAS (C-UAS) threat simulation trainer developed for **Problem Statement SIH26247** issued by the **Ministry of Defence / Defence Services Staff College, Wellington**.

The platform trains Indian military operators to detect, classify, and neutralize drone threats using the **OODA loop doctrine** (Observe → Orient → Decide → Act) — the same decision framework used by IAF and Army Air Defence operators in live operations.

**No server. No installation. Runs on any military hardware with a modern browser.**

---

## Live Demo

**[https://sih26247.vercel.app](https://sih26247.vercel.app)**

| Default Login | PIN |
|---|---|
| Sqn Ldr Vikram Sharma (IAF) | `284010` |
| Maj Rohan Rathore (Army-AD) | `749200` |
| Lt Cdr Karthik Nair (Navy) | `058120` |
| Wg Cdr Arjun Dev — DS Instructor | `000000` |
| Col Rajeshwar Singh — DS Instructor | `111111` |

---

## Key Features

### Operational Training
- **125 missions** across 5 tiers — Punjab IB, J&K LoC, Ladakh LAC, Arabian Sea Coast, Delhi Capital Defence Command
- **Night operations**, degraded sensors, fog, dust-storm, critical infrastructure environments
- **Cross-sector transit threats** — drones entering from one corridor and transiting toward another
- Scripted events + procedural spawn for unpredictable threat sequences

### Real Adversary Intelligence
- **23 real drone models** — Pakistan ISI (DJI Mavic/Phantom/Hexacopter/Burraq/Shahpar) + China PLAAF (CH-4B/TB001/Wing Loong/WZ-7/GJ-11) + Iran-sourced (Harop/Shahed-136/Shahed-238)
- **Fiber-Optic FPV mechanic** — FO-10 spool drone is 100% RF-immune; RF Jammer and GNSS Spoof return `pk=0 PROHIBITED`. Requires Laser-DEW or kinetic interceptor only
- **Civilian masking / ADS-B spoofing** — threats spoof Mode-S transponder as B777 or IL-76 heavy transport; operator must verify micro-Doppler before kinetic release
- **7 flight profiles**: stealth-ghost, kamikaze-sprint, zigzag-evasive, swarm-cluster, masked-cargo-flight, fiber-optic-tether, terrain-contour

### AI & Decision Support
- **Groq AI** (llama-3.1-8b-instant) — real-time threat type + intent assessment in under 1 second
- **4 sensor modalities**: RADAR (RCS), RF (spectrum), EO-IR (thermal), ACOUSTIC (signature)
- **Ballistics Pk/WEZ engine** — probability-of-kill per countermeasure x threat type x weather condition
- **Battery Station telemetry** — slant range, launch azimuth, elevation, time-of-flight per engagement
- **AI Tactical Coach** — Groq-powered post-mission coaching based on individual weakness profile

### Scoring Formula (PS26247)
```
Per engagement (max 100 pts):
  Detection Speed   +30 pts   spawn -> detect  (0 at 15s)
  Classification    +30 pts   type (15) + intent (15)
  Engagement Dec.   +25 pts   doctrine-correct countermeasure
  Speed             +15 pts   detect -> deploy  (0 at 10s)
  Fratricide        -25 pts   hostile fire on neutral/friendly

Mission grade: S (>=90% + 0 breach) | A (>=80%) | B (>=70%) | C (>=60%) | D (>=50%) | F (<50%)
```

### Training Records & Progression
- **5-axis Skill Passport** spider chart: Detection / Classification / Engagement / Response / Fratricide
- **Expert Ghost Replay** — optimal solution overlaid against actual operator decisions in AAR
- **MoD-format Training Record** — A4 print-ready with dual DS instructor signature blocks
- **13 achievement badges** + tier completion certificates
- **AI Adaptive Engine** — weakness profiling per trainee; biased spawn toward identified weak areas
- **Tier lock** — 70% accuracy required to advance; DS instructors bypass

### Instructor Tools
- **Multi-trainee PIN auth** — 5 pre-seeded profiles (IAF/Army-AD/Navy trainees + 2 DS instructors)
- **Instructor Dashboard** — TrendChart, sector distribution, unit roster, per-trainee SkillPassport
- **Custom Scenario Builder** — create named drills with any threat mix, time limit, sector
- **Real-time inject console** — jamming (20s), decoy, evasion (15s), time compression mid-mission

---

## Countermeasures & Pk Matrix

| Countermeasure | vs Commercial | vs Military | vs Swarm |
|---|---|---|---|
| RF Jammer | 94% OPTIMAL | 18% DEGRADED | 48% MARGINAL |
| GNSS Spoof | 92% OPTIMAL | 32% DEGRADED | 54% MARGINAL |
| Interceptor | 88% EFFECTIVE | 96% OPTIMAL | 32% DEGRADED |
| Laser DEW | 98%* clear | 91% | 98% |
| EW | 92% OPTIMAL | 76% EFFECTIVE | 99% OPTIMAL |

> *Laser-DEW: foggy 34%, dust-storm 30%, rainy 62%
> Fiber-Optic FPV: RF Jammer and GNSS Spoof are PROHIBITED (pk=0)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.4 (App Router), TypeScript 5, Tailwind CSS 4, Framer Motion |
| Map | Leaflet.js + Google Satellite tiles — 20+ classified military installations |
| AI / LLM | Groq Cloud API — llama-3.1-8b-instant (< 1s inference) |
| Physics | Custom Ballistics Pk/WEZ engine (lib/ballistics.ts) |
| Sensors | 4-modal derivation: RADAR RCS + RF spectrum + EO-IR + ACOUSTIC |
| Audio | Web Audio API — 5 programmatic sounds (no audio files) |
| Voice | Web Speech API — continuous spoken classification |
| Storage | localStorage (offline-first, zero server, zero database) |
| Doctrine | IAF Doctrine 2022, NACIN SOP 2023, DRDO SWM-2024 |

---

## Architecture

```
Browser (Next.js 16 App Router)
├── /                     Mission briefing — profile, tier, scenario select
├── /simulation           Live sim — HUD, Leaflet map, OODA panel, audio
├── /aar                  After-Action Review — scores, ghost replay, AI coach
├── /instructor           Instructor dashboard — trends, roster, scenario builder
├── /api/assess-threat    Groq LLM — real-time threat assessment (serverless)
└── /api/coaching         Groq LLM — weakness-based AAR coaching (serverless)

lib/
├── levels.ts             125 MissionBlueprints with real OP names + Fire Control Orders
├── scenario.ts           Threat spawn — batteryStation, fiber-optic, civilian masking
├── ballistics.ts         Pk/WEZ calculator — probability of kill per CM x threat x weather
├── droneModels.ts        23 adversary drone models with real specs + flight profiles
├── adaptiveEngine.ts     Weakness profiling + adaptive spawn weighting per trainee
├── doctrine.ts           IAF/NACIN/DRDO citation lookup per engagement
├── scoring.ts            PS26247 scoring formula implementation
└── storage.ts            Multi-profile PIN auth — 5 default military profiles
```

---

## 5 Operational Tiers

| Tier | Levels | Target | Threat Origin |
|---|---|---|---|
| 0 RECRUIT | 1-25 | Pathankot AFS | Pakistan Punjab IB |
| 1 CADET | 26-50 | Jammu AFS | Pakistan PoK LoC |
| 2 OPERATOR | 51-75 | Leh AFS | China PLAAF LAC |
| 3 SPECIALIST | 76-100 | Jaisalmer | Pakistan Sindh / Arabian Sea |
| 4 COMMANDER | 101-125 | Delhi ADC | Pakistan + China simultaneous |

---

## Local Setup

```bash
# Clone the repository
git clone https://github.com/tennetisaisantoshsriram-collab/sih26247.git
cd sih26247

# Install dependencies
npm install

# Add your Groq API key (free at console.groq.com/keys)
echo "GROQ_API_KEY=your_key_here" > .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

```bash
npm run build       # Production build
npx tsc --noEmit    # TypeScript check
```

---

## IAF Doctrine References

- **IAF Doctrine 2022** — Counter-UAS engagement rules, OODA-loop framework
- **NACIN SOP 2023** — National Centre of Excellence C-UAS standard operating procedures
- **DRDO SWM-2024** — Swarm Warfare Manual — EW countermeasures, mesh dissociation targeting

---

## Exclusive Differentiators

1. Real Indian geography — 20+ classified military bases with actual lat/lng on Google Satellite
2. 23 real adversary drones — Burraq, CH-4B, GJ-11, Shahed-238, Harop, fiber-optic FPV, biomimetic nano
3. IAF doctrine citations on every engagement decision
4. MoD-format Training Record with dual DS instructor signature blocks
5. Ballistics Pk/WEZ system — probability-of-kill per CM x threat x weather (no competitor has this)
6. Fiber-optic drone mechanic — RF-immune threat forces doctrine change
7. Civilian masking / transponder spoofing — micro-Doppler unmasking requirement
8. Battery Station telemetry — slant range, azimuth, elevation, time-of-flight per shot
9. Rich mission briefings — OP names + real Fire Control Orders per level
10. AI adaptive engine — Groq-coached, weakness-profiled, biased spawn per operator

---

## Problem Statement

**PS26247** — Ministry of Defence / Defence Services Staff College, Wellington
**Theme** — Robotics and Drones · Software
**SIH 2026** — Smart India Hackathon

---

<div align="center">

**Team Codephile · Smart India Hackathon 2026**

*Training the operators who defend India's skies.*

</div>
