import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "חיפוש...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{
      position: "relative",
      minWidth: 260,
      flex: 1,
      maxWidth: 520,
    }}>
      <Search size={17} style={{
        position: "absolute",
        right: 14,
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--text-muted)",
      }} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 42,
          borderRadius: 14,
          border: "1px solid #D9E2EF",
          background: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
          padding: "0 42px",
          fontFamily: "var(--font-main)",
          color: "var(--text-body)",
          outline: "none",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="נקה חיפוש"
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            border: 0,
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
