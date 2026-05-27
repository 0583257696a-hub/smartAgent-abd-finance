'use client'

import { useState } from "react";
import { Download, FileSpreadsheet, LogOut, Mail, Settings, Signature, User } from "lucide-react";
import SearchBar from "@/components/ui/SearchBar";
import { downloadTemplate } from "@/lib/excel-export";
import { signOut } from "@/lib/auth";
import { useAppStore } from "@/store/useAppStore";
import { moduleByRoute } from "@/lib/modules";
import { usePathname, useRouter } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const activeConfig = moduleByRoute(pathname);
  const {
    searchQuery,
    setSearchQuery,
    isGlobalSearch,
    setIsGlobalSearch,
    viewMode,
    setViewMode,
  } = useAppStore();

  return (
    <header style={{
      height: 56,
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
    }}>
      <h1 style={{
        minWidth: 180,
        margin: 0,
        color: "var(--text-heading)",
        fontSize: 20,
        fontWeight: 800,
      }}>
        {activeConfig?.title ?? "מרכז תפעול"}
      </h1>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={isGlobalSearch ? "חיפוש בכל המערכת..." : "חיפוש בטאב הנוכחי..."}
      />

      <Segmented
        options={[
          ["local", "בטאב"],
          ["global", "גלובלי"],
        ]}
        value={isGlobalSearch ? "global" : "local"}
        onChange={(value) => setIsGlobalSearch(value === "global")}
      />

      <Segmented
        options={[
          ["table", "טבלה"],
          ["cards", "כרטיסים"],
        ]}
        value={viewMode}
        onChange={(value) => setViewMode(value as "table" | "cards")}
      />

      <div style={{ position: "relative" }}>
        <button type="button" onClick={() => setOpen((value) => !value)} style={iconButton}>
          <Settings size={18} />
        </button>
        {open && (
          <div style={{
            position: "absolute",
            top: 48,
            left: 0,
            width: 230,
            background: "var(--bg-card)",
            border: "1px solid #DDE7F3",
            boxShadow: "var(--shadow-hover)",
            borderRadius: 14,
            padding: 8,
            zIndex: 20,
          }}>
            <MenuButton icon={<FileSpreadsheet size={16} />} label="ייבוא Excel" onClick={() => router.push("/settings")} />
            <MenuButton icon={<Download size={16} />} label="הורדת תבנית Excel" onClick={downloadTemplate} />
            <MenuButton icon={<Signature size={16} />} label="חתימת מייל" onClick={() => router.push("/settings")} />
            <MenuButton icon={<Mail size={16} />} label="מייל לתיוק" onClick={() => router.push("/settings")} />
            <MenuButton icon={<User size={16} />} label="פרופיל משתמש" onClick={() => router.push("/settings")} />
            <MenuButton icon={<LogOut size={16} />} label="התנתקות" onClick={async () => { await signOut(); router.push("/login"); }} />
          </div>
        )}
      </div>
    </header>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{
      display: "flex",
      background: "var(--bg-card)",
      border: "1px solid #DDE7F3",
      borderRadius: 12,
      padding: 3,
      boxShadow: "var(--shadow-card)",
      whiteSpace: "nowrap",
    }}>
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            border: 0,
            borderRadius: 9,
            padding: "7px 11px",
            background: value === key ? "var(--accent)" : "transparent",
            color: value === key ? "#fff" : "var(--text-muted)",
            fontFamily: "var(--font-main)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      border: 0,
      background: "transparent",
      color: "var(--text-body)",
      padding: "10px 11px",
      borderRadius: 10,
      cursor: "pointer",
      fontFamily: "var(--font-main)",
      textAlign: "right",
    }}>
      {icon}
      {label}
    </button>
  );
}

const iconButton: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "1px solid #DDE7F3",
  background: "var(--bg-card)",
  boxShadow: "var(--shadow-card)",
  color: "var(--text-body)",
  cursor: "pointer",
};
