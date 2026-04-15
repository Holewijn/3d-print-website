"use client";

// ─── Base shimmer block ───────────────────────────────────

interface SkeletonProps {
  width?:  string | number;
  height?: string | number;
  radius?: string | number;
  style?:  React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, radius = 6, style }: SkeletonProps) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
  );
}

// ─── Table rows ───────────────────────────────────────────

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ opacity: 1 - i * (0.08) }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: "0.75rem 1rem" }}>
              <Skeleton height={14} width={j === 0 ? "40%" : j === cols - 1 ? "60px" : "70%"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Stat card ────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton height={12} width="50%" style={{ marginBottom: 10 }} />
      <Skeleton height={28} width="65%" style={{ marginBottom: 6 }} />
      <Skeleton height={11} width="40%" />
    </div>
  );
}

// ─── Panel with rows ──────────────────────────────────────

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "center", opacity: 1 - i * 0.12 }}>
          <Skeleton width={40} height={40} radius={8} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton height={13} width="60%" style={{ marginBottom: 6 }} />
            <Skeleton height={11} width="35%" />
          </div>
          <Skeleton width={70} height={13} />
        </div>
      ))}
    </div>
  );
}
