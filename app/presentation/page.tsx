'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PresentationPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const SLIDES = [
    {
      badge: 'IDAS-C4I · MINISTRY OF DEFENCE',
      title: 'DroneShield: Next-Gen C-UAS Simulation',
      subtitle: 'AI-Enabled Counter-Unmanned Aerial System Tactical Trainer with 1,000 Real-World Operational Scenarios.',
      tag: 'Executive Overview',
      accentColor: '#3b82f6',
      points: [
        { label: 'Problem Space', desc: 'Proliferation of commercial FPVs, smuggling hexacopters, and military UCAVs penetrating Indian borders.' },
        { label: 'Our Solution', desc: 'Doctrinally authentic C-UAS trainer with 4-sensor data fusion, real-time AI, and strict Rules of Engagement (ROE).' },
        { label: 'Core Innovation', desc: '1,000 distinct scenarios with strategic cross-sector transit threats and sovereign Survey of India borders.' },
      ],
      mockup: {
        type: 'hero',
        heading: '1,000 Live Tactical Scenarios',
        pill: '● DEFENDING SOVEREIGN AIRSPACE',
        stat1: '1000+', stat1Lbl: 'Distinct Sorties',
        stat2: '15s', stat2Lbl: 'Boyd OODA Window',
        stat3: '99.4%', stat3Lbl: 'AI Classification',
      },
    },
    {
      badge: 'PROBLEM & GEOGRAPHICAL REALITY',
      title: 'Multi-Vector Border Infiltration',
      subtitle: 'Asymmetric aerial threats exploit diverse terrain, night conditions, and electronic countermeasures across all theaters.',
      tag: 'Threat Analysis',
      accentColor: '#ef4444',
      points: [
        { label: '🇵🇰 Pakistan IB / LoC', desc: 'Nocturnal riverine drops of AK-47s, Glock pistols, and narcotics across Punjab & J&K borders.' },
        { label: '🇨🇳 China LAC Plateau', desc: 'High-altitude standoff reconnaissance UCAVs (GJ-2, WZ-7) & encrypted mesh swarms in Ladakh and Arunachal.' },
        { label: '🇲🇲 Myanmar & Maritime', desc: 'Insurgent mortar quadcopters in the Northeast hills; sea-skimming kamikaze drones targeting offshore oil platforms.' },
      ],
      mockup: {
        type: 'vectors',
        heading: 'Sovereign Map & Confidential Bases',
        pill: '● SURVEY OF INDIA COMPLIANT',
        stat1: '28', stat1Lbl: 'Classified Bases',
        stat2: '5 Modes', stat2Lbl: 'Google Maps Engine',
        stat3: '100%', stat3Lbl: 'PoK / Aksai Chin Intact',
      },
    },
    {
      badge: 'ARCHITECTURAL INNOVATION',
      title: 'Strategic Cross-Sector Transit',
      subtitle: 'Hostile drones do not just fly at the radar mast; they traverse corridors toward adjacent Tier-1 strategic assets.',
      tag: 'Tactical Mechanics',
      accentColor: '#f59e0b',
      points: [
        { label: 'Pathankot → Adampur Intercept', desc: 'An operator stationed at AFS Pathankot must intercept a Burraq UCAV heading toward the Adampur S-400 battery.' },
        { label: 'CPA Window Enforcement', desc: 'If the drone passes the radial coverage boundary, intercept probability drops to zero and downstream assets take fatal damage.' },
        { label: 'Fixed Strategic Quotas', desc: 'Eliminated unrealistic arcade respawns. Each level features a fixed, doctrinally accurate threat quota (5 to 12 threats).' },
      ],
      mockup: {
        type: 'transit',
        heading: 'Corridor Lock & Range Gates',
        pill: '✈ ENROUTE: ADAMPUR AFB',
        stat1: '28s', stat1Lbl: 'Transit Window',
        stat2: '3.8km', stat2Lbl: 'Closest Approach (CPA)',
        stat3: '0%', stat3Lbl: 'Arcade Infinite Waves',
      },
    },
    {
      badge: 'OPERATOR COGNITIVE WORKFLOW',
      title: "Boyd's OODA Loop & Groq LLM",
      subtitle: 'Strict military decision workflow with live Groq LLaMA-3.1 inference delivering real-time threat intelligence.',
      tag: 'Doctrine & AI',
      accentColor: '#8b5cf6',
      points: [
        { label: '1. OBSERVE & ORIENT', desc: 'Radar target acquisition correlated across 4 sensors: Radar RCS, RF Spectrum, EO/IR Thermal FLIR, and Acoustic profiling.' },
        { label: '2. DECIDE', desc: 'Classification of Airframe Class (Commercial/Military/Swarm) and IFF Intent (Hostile/Neutral/Friendly) with keyboard hotkeys.' },
        { label: '3. ACT (Deploy Effector)', desc: 'Directional RF Jammer [Q], GNSS Spoof [T], Kinetic SAM [W], 10kW Laser DEW [Y], EW Suite [E], or Hold Fire [R].' },
      ],
      mockup: {
        type: 'ooda',
        heading: 'Live AI Decision Engine',
        pill: '● GROQ LLM REASONING TRACE',
        stat1: '8ms', stat1Lbl: 'Inference Latency',
        stat2: '4-Sensor', stat2Lbl: 'Diagnostic Fusion',
        stat3: '−25 pt', stat3Lbl: 'Fratricide Penalty',
      },
    },
    {
      badge: 'FIRE CONTROL VISIBILITY',
      title: '50% Screen Split & Full Manual',
      subtitle: 'High-visibility operator interface displaying exact payload carried, country origin source, and interactive doctrine manual.',
      tag: 'User Experience',
      accentColor: '#06b6d4',
      points: [
        { label: '📦 Clear Payload Highlighting', desc: 'Dedicated card displaying whether the drone carries 5kg RDX, 2x Glock pistols + heroin, or AR-1 laser missiles.' },
        { label: '🌐 Invasion Origin Source', desc: 'Prominent badge indicating launch sector, infiltration azimuth, altitude, and standoff distance.' },
        { label: '📖 Full-Page Tactical Manual', desc: 'Replaced passive video with a comprehensive 5-section military C-UAS handbook accessible anytime via [M] key.' },
      ],
      mockup: {
        type: 'panel',
        heading: 'Tactical Fire Control Console',
        pill: '● 50% COVER / DUAL COLUMN',
        stat1: '50vw', stat1Lbl: 'Map Coverage',
        stat2: 'Dual-Col', stat2Lbl: 'Intel & Fire Control',
        stat3: '1-Click', stat3Lbl: 'Full-Page Manual',
      },
    },
    {
      badge: 'DEFENCE IMPACT & COMPLIANCE',
      title: 'Standardized Scoring & Deployment',
      subtitle: 'Exact mathematical scoring formula from Ministry of Defence guidelines with After-Action Review (AAR) coaching.',
      tag: 'Evaluation & Impact',
      accentColor: '#10b981',
      points: [
        { label: 'Mathematical Scoring', desc: 'Detection (30 pts) + Classification (30 pts) + Effector (25 pts) + Reaction Speed (15 pts) − Fratricide (25 pts).' },
        { label: 'Comprehensive AAR', desc: 'Full trajectory replay, per-second reaction timeline, BDA shrapnel proof, and automated instructor coaching.' },
        { label: 'Operational Readiness', desc: 'Ready for integration into IAF Air Defence College, BSF Drone Command, and Indian Army Air Defence units.' },
      ],
      mockup: {
        type: 'impact',
        heading: 'Ministry of Defence Alignment',
        pill: '● 100% OPERATIONAL COMPLIANT',
        stat1: '100 pts', stat1Lbl: 'Max Score / Sortie',
        stat2: '5 Theaters', stat2Lbl: 'Punjab, J&K, Ladakh...',
        stat3: 'TRL 7', stat3Lbl: 'Operational Prototype',
      },
    },
  ];

  const slide = SLIDES[currentSlide];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentSlide(s => Math.min(SLIDES.length - 1, s + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide(s => Math.max(0, s - 1));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [SLIDES.length]);

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      backgroundColor: '#e6edf7',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(210, 225, 248, 0.8) 0%, rgba(230, 237, 247, 0.9) 90%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 32px', boxSizing: 'border-box',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1e293b',
    }}>

      {/* ── Outer Canvas Card (Matching Figma Clean UI Style) ── */}
      <div style={{
        maxWidth: '1280px', width: '100%', minHeight: '680px',
        backgroundColor: '#ffffff',
        borderRadius: '32px',
        boxShadow: '0 25px 70px rgba(15, 23, 42, 0.08), 0 4px 20px rgba(15, 23, 42, 0.03)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.8)',
      }}>

        {/* ── Top Navigation Bar ── */}
        <header style={{
          padding: '20px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
        }}>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              width: '32px', height: '32px', borderRadius: '10px',
              backgroundColor: '#0f172a', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: 900,
            }}>
              🛡
            </span>
            <div>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                DroneShield
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', display: 'block', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                IDAS-C4I · Integrated Tactical Air Defense
              </span>
            </div>
          </div>

          {/* Slide Category Pills */}
          <nav style={{ display: 'flex', gap: '8px' }}>
            {SLIDES.map((s, idx) => (
              <button
                key={s.tag}
                onClick={() => setCurrentSlide(idx)}
                style={{
                  padding: '6px 14px', borderRadius: '999px', border: 'none',
                  backgroundColor: currentSlide === idx ? '#0f172a' : 'transparent',
                  color: currentSlide === idx ? '#ffffff' : '#64748b',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {s.tag}
              </button>
            ))}
          </nav>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '8px 16px', borderRadius: '999px',
                border: '1px solid #e2e8f0', backgroundColor: '#ffffff',
                color: '#334155', fontSize: '11px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              🎮 Open Simulator
            </button>
            <button
              onClick={() => router.push('/simulation')}
              style={{
                padding: '8px 18px', borderRadius: '999px',
                border: 'none', backgroundColor: '#3b82f6',
                color: '#ffffff', fontSize: '11px', fontWeight: 800,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
              }}
            >
              ⚡ Live Sortie →
            </button>
          </div>
        </header>

        {/* ── Slide Main Body (2-Column Hero Layout) ── */}
        <div style={{
          flex: 1, padding: '48px 52px',
          display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '48px',
          alignItems: 'center',
        }}>

          {/* Left Column: Headlines & Bullet Points */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: slide.accentColor }} />
              <span style={{ fontSize: '10px', fontWeight: 800, color: slide.accentColor, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {slide.badge}
              </span>
            </div>

            <h1 style={{
              margin: '0 0 16px', fontSize: '38px', fontWeight: 900,
              color: '#0f172a', letterSpacing: '-0.03em', lineHeight: '1.15',
            }}>
              {slide.title}
            </h1>

            <p style={{
              margin: '0 0 28px', fontSize: '14.5px', color: '#64748b',
              lineHeight: '1.6', maxWidth: '540px',
            }}>
              {slide.subtitle}
            </p>

            {/* Key Value Points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {slide.points.map((pt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    backgroundColor: `${slide.accentColor}18`, color: slide.accentColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 900, flexShrink: 0, marginTop: '2px',
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                      {pt.label}:{' '}
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.45' }}>
                      {pt.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                onClick={() => router.push('/simulation')}
                style={{
                  padding: '14px 28px', borderRadius: '16px',
                  backgroundColor: '#3b82f6', color: '#ffffff',
                  fontSize: '13px', fontWeight: 800, border: 'none',
                  cursor: 'pointer', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.35)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Launch Tactical Sortie →
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '14px 22px', borderRadius: '16px',
                  backgroundColor: '#f8fafc', color: '#475569',
                  fontSize: '13px', fontWeight: 700, border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                }}
              >
                Inspect 1000 Scenarios
              </button>
            </div>
          </div>

          {/* Right Column: Visual Mockup Card (Soft 3D / Isometric Aesthetic) */}
          <div style={{
            position: 'relative',
            backgroundColor: '#f8fafc',
            borderRadius: '28px',
            border: '1px solid #e2e8f0',
            padding: '32px',
            boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.8), 0 20px 40px rgba(15, 23, 42, 0.04)',
            display: 'flex', flexDirection: 'column', gap: '20px',
          }}>
            {/* Top Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontSize: '10px', fontWeight: 800, color: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '999px',
              }}>
                {slide.mockup.pill}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>
                LIVE C2 INTERACTION
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              {slide.mockup.heading}
            </h3>

            {/* Interactive Preview Graphics */}
            <div style={{
              backgroundColor: '#ffffff', borderRadius: '20px', padding: '20px',
              border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.03)',
            }}>
              {slide.mockup.type === 'hero' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Burraq UCAV Ingress</span>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#ef4444', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>CRITICAL</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '84%', height: '100%', backgroundColor: '#ef4444' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                    <b>Payload:</b> 2x AR-1 Laser Guided Missiles · <b>Origin:</b> Pakistan IB
                  </p>
                </div>
              )}

              {slide.mockup.type === 'vectors' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Legal Sovereign Borders</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981' }}>✔ gl=IN Survey of India</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    Official international borders (PoK, Aksai Chin, Arunachal) natively rendered without dashed lines.
                  </p>
                </div>
              )}

              {slide.mockup.type === 'transit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b' }}>Cross-Sector Corridor</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b' }}>CPA: 3.8 KM</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    Stationed at Pathankot: drone traversing sector en route to Adampur S-400 battery.
                  </p>
                </div>
              )}

              {slide.mockup.type === 'ooda' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
                  {['OBSERVE', 'ORIENT', 'DECIDE', 'ACT'].map((st, idx) => (
                    <div key={st} style={{ padding: '6px 4px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: '#3b82f6', display: 'block' }}>STEP {idx + 1}</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a' }}>{st}</span>
                    </div>
                  ))}
                </div>
              )}

              {slide.mockup.type === 'panel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>50% Screen Split View</span>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    Clear left column for drone payload & origin source; right column for Groq AI & effectors.
                  </p>
                </div>
              )}

              {slide.mockup.type === 'impact' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981' }}>Scoring Breakdown: 100 Pts</span>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    Detection (30) + Classification (30) + Effector (25) + Speed (15) − Fratricide (25).
                  </p>
                </div>
              )}
            </div>

            {/* 3 Metric Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', display: 'block' }}>{slide.mockup.stat1}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>{slide.mockup.stat1Lbl}</span>
              </div>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', display: 'block' }}>{slide.mockup.stat2}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>{slide.mockup.stat2Lbl}</span>
              </div>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', display: 'block' }}>{slide.mockup.stat3}</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b' }}>{slide.mockup.stat3Lbl}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Bottom Carousel Footer Bar ── */}
        <footer style={{
          padding: '20px 48px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#ffffff',
        }}>
          {/* Slide Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
              {String(currentSlide + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>/</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>
              {String(SLIDES.length).padStart(2, '0')}
            </span>
          </div>

          {/* Slide Progress Dots */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                style={{
                  width: currentSlide === i ? '24px' : '8px', height: '8px',
                  borderRadius: '4px', border: 'none',
                  backgroundColor: currentSlide === i ? '#0f172a' : '#e2e8f0',
                  cursor: 'pointer', transition: 'all 0.2s ease', padding: 0,
                }}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
              disabled={currentSlide === 0}
              style={{
                padding: '8px 18px', borderRadius: '12px',
                border: '1px solid #e2e8f0', backgroundColor: currentSlide === 0 ? '#f8fafc' : '#ffffff',
                color: currentSlide === 0 ? '#cbd5e1' : '#334155',
                fontSize: '11px', fontWeight: 800, cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Prev
            </button>
            <button
              onClick={() => setCurrentSlide(s => Math.min(SLIDES.length - 1, s + 1))}
              disabled={currentSlide === SLIDES.length - 1}
              style={{
                padding: '8px 20px', borderRadius: '12px',
                border: 'none', backgroundColor: currentSlide === SLIDES.length - 1 ? '#e2e8f0' : '#0f172a',
                color: '#ffffff', fontSize: '11px', fontWeight: 800,
                cursor: currentSlide === SLIDES.length - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}
