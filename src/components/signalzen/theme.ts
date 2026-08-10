import { useMemo } from "react";

function readableForeground(color: string): string {
  if (typeof document === "undefined") return "#ffffff";
  try {
    const probe = document.createElement("span");
    probe.style.color = color;
    probe.style.display = "none";
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    const m = rgb.match(/rgba?\(([^)]+)\)/);
    if (!m) return "#ffffff";
    const [r, g, b] = m[1].split(",").map((v) => parseFloat(v.trim()));
    const toLin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    return L > 0.5 ? "oklch(0.18 0.005 270)" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}

export function useThemeStyle(
  primaryColor?: string,
  secondaryColor?: string,
  accentColor?: string,
  textColor?: string,
): React.CSSProperties | undefined {
  return useMemo(() => {
    const hasAny = primaryColor || secondaryColor || accentColor || textColor;
    if (!hasAny) return undefined;
    const fg = primaryColor ? readableForeground(primaryColor) : undefined;
    const sf = secondaryColor ? readableForeground(secondaryColor) : undefined;
    const af = accentColor ? readableForeground(accentColor) : undefined;
    const muted = textColor ? `color-mix(in oklch, ${textColor}, transparent 40%)` : undefined;
    return {
      ...(textColor && { color: "var(--foreground)" }),
      ...(primaryColor && {
        ["--accent" as string]: primaryColor,
        ["--accent-foreground" as string]: fg,
        ["--ring" as string]: primaryColor,
        ["--primary" as string]: primaryColor,
        ["--primary-foreground" as string]: fg,
      }),
      ...(secondaryColor && {
        ["--secondary" as string]: secondaryColor,
        ["--secondary-foreground" as string]: sf,
      }),
      ...(accentColor && {
        ["--widget-accent" as string]: accentColor,
        ["--widget-accent-foreground" as string]: af,
      }),
      ...(textColor && {
        ["--foreground" as string]: textColor,
        ["--card-foreground" as string]: textColor,
        ["--popover-foreground" as string]: textColor,
        ["--muted-foreground" as string]: muted,
      }),
    } as React.CSSProperties;
  }, [primaryColor, secondaryColor, accentColor, textColor]);
}
