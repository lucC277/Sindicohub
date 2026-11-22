export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="panel" aria-busy="true" aria-label="Carregando conteúdo">
      <div className="panel-body skeleton-stack">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="skeleton-block"
            style={{ height: idx === 0 ? '20px' : '42px', width: idx === 0 ? '40%' : '100%' }}
          />
        ))}
      </div>
    </div>
  );
}
