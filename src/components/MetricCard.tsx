import type { ReactNode } from 'react';

interface Props { label: string; value: ReactNode; description?: ReactNode; onClick?: () => void; selected?: boolean; loading?: boolean; }

export default function MetricCard({ label, value, description, onClick, selected, loading }: Props) {
  const content = <>
    <span className="ui-metric-value block">{loading ? <span className="block h-7 w-16 animate-pulse rounded bg-slate-100" aria-label="Cargando" /> : value}</span>
    <span className="ui-metric-label mt-1 block">{label}</span>
    {description && <span className="mt-0.5 block text-xs leading-4 text-slate-600">{description}</span>}
  </>;
  return onClick ? <button type="button" onClick={onClick} aria-pressed={selected} className="ui-metric">{content}</button> : <div className="ui-metric">{content}</div>;
}
