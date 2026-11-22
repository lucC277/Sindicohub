export function BarMetricChart({ items, emptyMessage = 'Sem dados registrados.' }) {
  if (!items || items.length === 0) {
    return <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>{emptyMessage}</p>;
  }

  const maxVal = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="chart-list">
      {items.map((item) => {
        const pct = Math.round((item.value / maxVal) * 100);
        return (
          <div key={item.label} className="chart-row">
            <div className="chart-row-head">
              <span className="chart-row-label">{item.label}</span>
              <span className="chart-row-value">
                {item.value}
                {item.suffix ? ` ${item.suffix}` : ''}
              </span>
            </div>
            <div className="chart-bar-track" aria-hidden="true">
              <div
                className={`chart-bar-fill ${item.tone ? `tone-${item.tone}` : ''}`}
                style={{ width: `${item.value === 0 ? 0 : Math.max(pct, 4)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
