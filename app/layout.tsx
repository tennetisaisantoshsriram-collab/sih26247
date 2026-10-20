import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DroneShield — AI-Enabled Counter-Drone Tactical Trainer | IDAS-C4I',
  description: 'Integrated Air Defense Command — Train operators to detect, classify, and neutralize drone & swarm threats across 125 militarily-designed missions using AI-assisted OODA loop decision-making.',
  keywords: 'drone trainer, counter-UAS, C-UAS, simulation, IAF, Indian Army, defence, OODA, air defense',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', width: '100%', background: '#0a0a0f', fontFamily: 'Inter, sans-serif', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
