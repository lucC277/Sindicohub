export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon" aria-hidden="true">
          <Icon size={22} />
        </div>
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: '0.45rem' }}>{action}</div>}
    </div>
  );
}
