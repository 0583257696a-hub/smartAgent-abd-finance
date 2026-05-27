import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "var(--bg-shell)" }}>
      <Sidebar />
      <main style={{ marginRight: "var(--sidebar-width)", padding: 24 }}>{children}</main>
    </div>
  );
}
