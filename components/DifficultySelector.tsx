'use client';
import { Difficulty } from '@/types';

interface Props {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
}

const options: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy',   label: 'Easy',   description: '1 drone · Slow · Commercial only' },
  { value: 'medium', label: 'Medium', description: '2–3 drones · Night overlay' },
  { value: 'hard',   label: 'Hard',   description: 'Swarms · Decoys · Sensor noise' },
];

export default function DifficultySelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4 w-full">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all duration-200
            ${value === opt.value
              ? 'border-gray-900 bg-white shadow-lg'
              : 'border-transparent bg-white/60 hover:bg-white hover:shadow-lg'}
          `}
        >
          <span className="text-base font-semibold text-gray-900">{opt.label}</span>
          <span className="text-xs text-gray-500 text-center leading-relaxed">{opt.description}</span>
        </button>
      ))}
    </div>
  );
}
