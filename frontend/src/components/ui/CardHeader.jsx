// Card title row: an icon, the title, and optional controls on the right.
// Pass titleId and point the card's aria-labelledby at it.
export const CardHeader = ({ icon: Icon, title, titleId, actions, children }) => (
  <div className="card-header">
    <h2 className="card-head" id={titleId}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      <span>{title}</span>
      {children}
    </h2>
    {actions && <div className="card-header-actions">{actions}</div>}
  </div>
);
