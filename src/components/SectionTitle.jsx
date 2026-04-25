export function SectionTitle({ children, action }) {
  return (
    <h3 className="section-title">
      <span>{children}</span>
      {action && <span className="section-title__action">{action}</span>}
    </h3>
  );
}
