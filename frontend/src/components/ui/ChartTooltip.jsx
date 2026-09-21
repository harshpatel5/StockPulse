// One tooltip shell for every chart. `rows` is [{ label, value, color, dashed }].
export const ChartTooltip = ({ title, rows = [] }) => (
  <div className="chart-tooltip">
    {title && <p className="tooltip-label">{title}</p>}
    {rows.map((row) => (
      <p key={row.label} className="tooltip-row">
        {row.color && (
          <span
            className={`tooltip-swatch${row.dashed ? ' dashed' : ''}`}
            style={{ background: row.dashed ? 'transparent' : row.color, borderColor: row.color }}
            aria-hidden="true"
          />
        )}
        <span className="tooltip-name">{row.label}</span>
        <span className="tooltip-value">{row.value}</span>
      </p>
    ))}
  </div>
);
