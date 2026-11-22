export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
