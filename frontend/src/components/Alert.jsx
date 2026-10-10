const STYLES = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

export default function Alert({ type = 'error', children, onDismiss }) {
  if (!children) return null;
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${STYLES[type]}`}>
      <p>{children}</p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="font-semibold">
          Close
        </button>
      )}
    </div>
  );
}
