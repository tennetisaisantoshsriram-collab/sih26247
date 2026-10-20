'use client';
import { useEffect, useRef, useState } from 'react';
import { ThreatType, Intent } from '@/types';

export function useVoiceCommand(
  onType: (t: ThreatType) => void,
  onIntent: (i: Intent) => void,
  enabled: boolean,
): boolean {
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onTypeRef   = useRef(onType);
  const onIntentRef = useRef(onIntent);

  // Keep refs current without restarting recognition
  onTypeRef.current   = onType;
  onIntentRef.current = onIntent;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e: any) => {
      const transcript = Array.from<any>(e.results)
        .slice(e.resultIndex)
        .map((r: any) => r[0].transcript.toLowerCase())
        .join(' ');

      if (transcript.includes('commercial')) onTypeRef.current('commercial');
      else if (transcript.includes('military') || transcript.includes('missile')) onTypeRef.current('military');
      else if (transcript.includes('swarm')) onTypeRef.current('swarm');

      if (transcript.includes('hostile')) onIntentRef.current('hostile');
      else if (transcript.includes('neutral')) onIntentRef.current('neutral');
      else if (transcript.includes('friendly')) onIntentRef.current('friendly');
    };

    recognition.onerror = () => { /* silently ignore permission errors */ };

    try { recognition.start(); } catch { /* already started */ }
    recognitionRef.current = recognition;

    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [enabled]);

  return supported;
}
