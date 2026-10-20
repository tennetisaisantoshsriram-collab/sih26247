export interface ROEEntry {
  tier: number;
  sector: string;
  alertLevel: 'YELLOW' | 'ORANGE' | 'RED';
  authorized: string[];
  restricted: string[];
  engagementAuth: string;
  notes: string;
}

const ROE_ENTRIES: ROEEntry[] = [
  {
    tier: 0,
    sector: 'Punjab Sector — IB Zone',
    alertLevel: 'YELLOW',
    authorized: [
      'RF jamming after classification',
      'Kinetic intercept on confirmed hostile',
      'EW suppression on confirmed swarm',
    ],
    restricted: [
      'Engage without full classification',
      'Kinetic on neutral/friendly IFF',
      'Cross-border kinetic engagement',
    ],
    engagementAuth: 'Sector Commander, AF Station Pathankot',
    notes: 'Pakistan IB proximity — fratricide risk elevated. Confirm type+intent before every engagement.',
  },
  {
    tier: 1,
    sector: 'J&K LoC Zone',
    alertLevel: 'ORANGE',
    authorized: [
      'RF jamming (all classified threats)',
      'EW countermeasure (swarm and military)',
      'Kinetic intercept (confirmed hostile, 5 km+)',
      'Alert-evacuate (neutral/friendly incursion)',
    ],
    restricted: [
      'Engage unclassified contact',
      'Kinetic within 2 km of LoC',
      'Engage neutral intent contacts',
    ],
    engagementAuth: 'ADGM, Northern Command',
    notes: 'LoC proximity — escalation risk HIGH. Every engagement logged. Decoy probability elevated from Tier 1.',
  },
  {
    tier: 2,
    sector: 'Ladakh LAC Zone',
    alertLevel: 'ORANGE',
    authorized: [
      'EW jamming (PLAAF drones, ISR class)',
      'Kinetic intercept (confirmed armed UCAV)',
      'RF denial on confirmed military type',
    ],
    restricted: [
      'Kinetic on ISR-only asset without HQ auth',
      'Engage within 10 km of LAC without confirmation',
      'Engage any contact classified as neutral',
    ],
    engagementAuth: 'XIV Corps Commander, Leh, with HQ IDS approval',
    notes: 'China LAC — diplomatic sensitivity MAXIMUM. ISR drones may be grey area. Prefer EW over kinetic where possible.',
  },
  {
    tier: 3,
    sector: 'Rajasthan / Arabian Sea',
    alertLevel: 'ORANGE',
    authorized: [
      'Full kinetic on confirmed hostile (land)',
      'EW and RF jamming (maritime or land)',
      'Alert-evacuate on ambiguous IFF',
    ],
    restricted: [
      'Engage within 12 nm of Pakistan territorial waters without ADIZ confirmation',
      'Kinetic on civilian maritime vessel',
    ],
    engagementAuth: 'South Western Air Command, Gandhinagar',
    notes: 'Dual domain (land + sea). Maritime ROE differs from land ROE — verify domain before countermeasure selection.',
  },
  {
    tier: 4,
    sector: 'National Capital Region — Multi-Vector',
    alertLevel: 'RED',
    authorized: [
      'All countermeasures — full authority',
      'Simultaneous multi-track engagement',
      'Kinetic, EW, RF — all authorised',
    ],
    restricted: [
      'Engage friendly or neutral IFF under any circumstances',
      'Deploy kinetic within 500 m of Rashtrapati Bhavan / Parliament without PM auth',
    ],
    engagementAuth: 'CISC, IDS — direct line to PM NSCS',
    notes: 'CRITICAL sector. Every engagement has strategic consequence. No fratricide tolerated. Speed and accuracy both required.',
  },
];

export function getROE(levelNum: number): ROEEntry {
  const tier = Math.min(4, Math.floor((levelNum - 1) / 25));
  return ROE_ENTRIES[tier];
}
