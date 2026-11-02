type LoadingStateProps = {
  label?: string;
  compact?: boolean;
};

export default function LoadingState({ label = 'Cargando información…', compact = false }: LoadingStateProps) {
  return (
    <div role="status" className={`ui-content-enter ${compact ? 'flex items-center justify-center gap-3 py-4' : 'mx-auto w-full max-w-6xl space-y-5 py-4'}`}>
      <div className="flex items-center justify-center gap-3 text-sm font-medium text-content-muted">
        <span aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        <span>{label}</span>
      </div>
      {!compact && (
        <div aria-hidden="true" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="h-5 w-1/3 animate-pulse rounded-md bg-gray-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="space-y-3 pt-3">
            {[0, 1, 2].map(row => <div key={row} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        </div>
      )}
    </div>
  );
}
