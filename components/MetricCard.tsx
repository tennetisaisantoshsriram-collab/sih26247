interface Props {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export default function MetricCard({ label, value, unit, highlight }: Props) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-2 ${highlight ? 'ring-2 ring-gray-900' : ''}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
      <div className="flex items-end gap-1">
        <span className="text-4xl font-extrabold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500 mb-1">{unit}</span>}
      </div>
    </div>
  );
}
