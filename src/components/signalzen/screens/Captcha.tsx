import { useEffect, useMemo, useRef } from "react";

const API_HOST = (import.meta.env.VITE_API_HOST as string) ?? "https://api.signalzen.com";
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;
const CAPTCHA_ORIGIN = new URL(API_HOST).origin;

export function CaptchaOverlay({ onSolved }: { onSolved: (token: string) => void }) {
  const nonce = useRef(Math.random().toString(36).slice(2)).current;

  const src = useMemo(() => {
    const url = new URL("/captcha.html", API_HOST);
    url.searchParams.set("sk", SITE_KEY);
    url.searchParams.set("nonce", nonce);
    return url.toString();
  }, [nonce]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== CAPTCHA_ORIGIN) return;
      if (
        e.data &&
        e.data.type === "sz_captcha" &&
        e.data.nonce === nonce &&
        typeof e.data.token === "string"
      ) {
        onSolved(e.data.token);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [nonce, onSolved]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-card/90 backdrop-blur-sm">
      <iframe
        src={src}
        title="Security check"
        style={{ border: "none", width: "310px", height: "440px", background: "transparent" }}
      />
    </div>
  );
}
