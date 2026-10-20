'use client';
import { motion } from 'framer-motion';
import { CountermeasureType } from '@/types';

interface Props {
  onSelect: (cm: CountermeasureType) => void;
}

const countermeasures: { value: CountermeasureType; label: string; icon: string; description: string }[] = [
  { value: 'rf-jammer',      label: 'RF Jammer',          icon: '📡', description: 'Disrupt communications' },
  { value: 'interceptor',    label: 'Interceptor Drone',  icon: '🚁', description: 'Physical neutralization' },
  { value: 'ew',             label: 'Electronic Warfare', icon: '⚡',  description: 'Swarm suppression' },
  { value: 'alert-evacuate', label: 'Alert & Evacuate',   icon: '🚨', description: 'Non-hostile protocol' },
];

export default function CountermeasurePanel({ onSelect }: Props) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
      className="bg-white rounded-t-[24px] shadow-xl p-6 flex flex-col gap-5"
    >
      <h3 className="text-lg font-bold text-gray-900">Deploy Countermeasure</h3>
      <div className="grid grid-cols-2 gap-3">
        {countermeasures.map(cm => (
          <button
            key={cm.value}
            onClick={() => onSelect(cm.value)}
            className="flex flex-col items-start gap-1 p-4 rounded-2xl border-2 border-gray-100 hover:border-gray-900 hover:shadow-lg transition-all text-left"
          >
            <span className="text-2xl">{cm.icon}</span>
            <span className="text-sm font-semibold text-gray-900">{cm.label}</span>
            <span className="text-xs text-gray-500">{cm.description}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
