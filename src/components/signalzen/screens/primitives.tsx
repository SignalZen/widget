import { type ReactNode, type ButtonHTMLAttributes, useRef, useState } from "react";
import { SparkleIcon } from "../icons";
import { type Operator } from "./types";

export function Avatar({
  name,
  src,
  size = 28,
  online,
  ai,
  tooltip,
  showTooltip,
}: {
  name: string;
  src?: string;
  size?: number;
  online?: boolean;
  ai?: boolean;
  tooltip?: string;
  showTooltip?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);

  const initials = name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      style={{ width: size, height: size }}
      onMouseEnter={() =>
        showTooltip && !ai && setTipRect(ref.current?.getBoundingClientRect() ?? null)
      }
      onMouseLeave={() => setTipRect(null)}
    >
      <div
        className="grid h-full w-full place-items-center overflow-hidden rounded-full border border-border bg-subtle text-[11px] font-semibold text-muted-foreground"
        style={{ fontSize: size * 0.36 }}
      >
        {ai ? (
          <SparkleIcon className="text-accent" style={{ width: size * 0.5, height: size * 0.5 }} />
        ) : src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border-2 border-card ${
            online ? "bg-success" : "bg-muted-foreground/40"
          }`}
        />
      )}
      {tipRect && (
        <div
          className="pointer-events-none z-[9999]"
          style={{
            position: "fixed",
            left: tipRect.left + tipRect.width / 2,
            top: tipRect.top - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="w-max max-w-[200px] rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] leading-tight shadow-lg">
            <div className="font-semibold text-background">{name}</div>
            {tooltip && (
              <div className="mt-0.5 whitespace-pre-line text-background/60">{tooltip}</div>
            )}
          </div>
          <div className="mx-auto h-1.5 w-1.5 rotate-45 bg-foreground" />
        </div>
      )}
    </div>
  );
}

export function AvatarStack({
  operators,
  ai,
  size = 24,
  max = 3,
  showTooltip,
}: {
  operators: Operator[];
  ai?: boolean;
  size?: number;
  max?: number;
  showTooltip?: boolean;
}) {
  const shown = operators.slice(0, max);
  const extra = operators.length - shown.length;
  const overlap = Math.round(size * 0.25);

  type Item = { kind: "ai" } | { kind: "op"; op: Operator } | { kind: "extra"; count: number };

  const items: Item[] = [
    ...(ai ? [{ kind: "ai" as const }] : []),
    ...shown.map((op) => ({ kind: "op" as const, op })),
    ...(extra > 0 ? [{ kind: "extra" as const, count: extra }] : []),
  ];

  return (
    <div className="flex">
      {items.map((item, i) => {
        const ml = i === 0 ? 0 : -overlap;
        const zIndex = items.length - i;
        if (item.kind === "ai")
          return (
            <div
              key="ai"
              className="rounded-full ring-2 ring-card"
              style={{ marginLeft: ml, zIndex }}
            >
              <Avatar name="AI" size={size} ai />
            </div>
          );
        if (item.kind === "op")
          return (
            <div
              key={item.op.id}
              className="rounded-full ring-2 ring-card"
              style={{ marginLeft: ml, zIndex }}
            >
              <Avatar
                name={item.op.name}
                src={item.op.avatarUrl}
                size={size}
                tooltip={item.op.tooltip}
                showTooltip={showTooltip}
              />
            </div>
          );
        return (
          <div
            key="extra"
            className="grid place-items-center rounded-full bg-subtle text-muted-foreground ring-2 ring-card"
            style={{
              width: size,
              height: size,
              fontSize: size * 0.33,
              fontWeight: 600,
              marginLeft: ml,
              zIndex,
            }}
          >
            +{item.count}
          </div>
        );
      })}
    </div>
  );
}

export function IconBtn({
  children,
  onClick,
  label,
  className = "",
  ...rest
}: {
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label: string;
  className?: string;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "type" | "aria-label" | "className"
>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          style={{ animation: `sz-pulse-dot 1.2s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </span>
  );
}

export function EventLine({ children }: { children: ReactNode }) {
  return (
    <div className="my-2 flex items-center gap-3 px-1">
      <div className="h-px flex-1 bg-border" />
      <div className="text-[11px] font-medium text-muted-foreground">{children}</div>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
