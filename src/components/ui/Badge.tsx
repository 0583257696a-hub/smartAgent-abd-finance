export default function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const colors = {
    default: ["var(--accent-light)", "var(--accent)"],
    success: ["var(--status-active-bg)", "var(--status-active)"],
    warning: ["var(--status-pending-bg)", "var(--status-pending)"],
    danger: ["var(--status-blocked-bg)", "var(--status-blocked)"],
  } satisfies Record<string, [string, string]>;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "3px 9px",
      background: colors[tone][0],
      color: colors[tone][1],
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}
