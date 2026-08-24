import { createFileRoute } from "@tanstack/react-router";
import { SignalzenWidget, WidgetGallery } from "@/components/signalzen/Widget";
import { SparkleIcon } from "@/components/signalzen/icons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SignalZen — Live Chat Widget, redesigned" },
      {
        name: "description",
        content:
          "A minimal, AI-first customer support widget. Premium design, all the SignalZen functionality, none of the messenger clichés.",
      },
      { property: "og:title", content: "SignalZen — Live Chat Widget, redesigned" },
      {
        property: "og:description",
        content:
          "A minimal, AI-first customer support widget. Premium design, all the SignalZen functionality.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-foreground text-background">
              <SparkleIcon className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              SignalZen
            </span>
            <span className="ml-2 hidden rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              Widget · v2
            </span>
          </div>
          <nav className="hidden items-center justify-center gap-1 md:flex">
            {["Overview", "Screens", "System", "Customize"].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
              >
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#screens"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
            >
              Docs
            </a>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90">
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="overview" className="mx-auto max-w-7xl px-6 pb-12 pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_minmax(0,1fr)]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              The new SignalZen widget · v2
            </div>
            <h1 className="text-balance text-[44px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[56px]">
              Customer support
              <br />
              <span className="text-muted-foreground">that doesn't feel like</span>
              <br />
              customer support.
            </h1>
            <p className="mt-6 max-w-xl text-balance text-base leading-relaxed text-muted-foreground">
              A quiet, AI-first chat widget designed in the spirit of Linear, Raycast
              and Arc. Every feature you already use — instant AI answers, human
              handoff, help center, attachments, ratings — wrapped in a calmer,
              faster, more grown-up interface.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#screens"
                className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90"
              >
                See every screen
              </a>
              <a
                href="#system"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-subtle"
              >
                Design system
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                { k: "12 kB", v: "Bundle size" },
                { k: "<60ms", v: "Time to first paint" },
                { k: "WCAG AA", v: "Accessible" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="text-[20px] font-semibold tracking-tight text-foreground">
                    {s.k}
                  </dt>
                  <dd className="text-xs text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Principles
          </div>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
            Quiet by default. Loud when it matters.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              t: "Minimal & elegant",
              d: "Neutral palette, generous whitespace, one configurable accent.",
            },
            {
              t: "AI-first",
              d: "The composer is a prompt. Answers stream with cards, code and sources.",
            },
            {
              t: "Calm & trustworthy",
              d: "No gradients, no glass, no neon. Subtle shadows, large 16–20px radii.",
            },
            {
              t: "Fast & lightweight",
              d: "Quick interactions, no excessive motion, accessible to keyboards & screen readers.",
            },
          ].map((p) => (
            <div
              key={p.t}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="text-sm font-semibold text-foreground">{p.t}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {p.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section id="screens" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Screens
            </div>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
              Every state of the widget.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All ten screens, all functionality preserved — re-imagined as a single
              cohesive design system. Use the floating launcher in the bottom-right
              to try the full experience.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-card px-2.5 py-1">
              Welcome
            </span>
            <span className="rounded-full border border-border bg-card px-2.5 py-1">
              AI · Human
            </span>
            <span className="rounded-full border border-border bg-card px-2.5 py-1">
              Help Center
            </span>
            <span className="rounded-full border border-border bg-card px-2.5 py-1">
              Mobile
            </span>
          </div>
        </div>
        <WidgetGallery />
      </section>

      {/* Design system */}
      <section id="system" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-8 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Design system
          </div>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
            A single accent. A neutral world around it.
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-sm font-semibold text-foreground">Palette</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Neutral surfaces, one configurable accent.
            </p>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {[
                "var(--background)",
                "var(--surface)",
                "var(--subtle)",
                "var(--border)",
                "var(--muted-foreground)",
                "var(--foreground)",
              ].map((c) => (
                <div
                  key={c}
                  className="aspect-square rounded-lg border border-border"
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg" style={{ background: "var(--accent)" }} />
              <div className="text-xs">
                <div className="font-semibold text-foreground">Accent</div>
                <div className="text-muted-foreground">--accent · configurable</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-sm font-semibold text-foreground">Typography</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Inter with tightened tracking. Mono for code.
            </p>
            <div className="mt-4 space-y-2">
              <div className="text-[26px] font-semibold tracking-tight text-foreground">
                Hi there 👋
              </div>
              <div className="text-sm text-muted-foreground">
                The quick brown fox jumps over the lazy dog.
              </div>
              <code className="block rounded-lg bg-subtle px-2 py-1 font-mono text-[12px] text-foreground">
                npm install @signalzen/widget
              </code>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-sm font-semibold text-foreground">Surfaces</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Large radii (16–20px), subtle 1px borders, soft shadows.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border bg-card p-3 text-xs text-foreground shadow-card">
                Card · radius 14
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-xs text-foreground shadow-card">
                Card · radius 20
              </div>
              <div className="rounded-3xl border border-border bg-card p-3 text-xs text-foreground shadow-[var(--shadow-widget)]">
                Widget shell · radius 24 + widget shadow
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Install / Embed */}
      <section id="install" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Drop-in install
          </div>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
            One script. Any page. Zero CSS conflicts.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The widget mounts inside a Shadow DOM with its own stylesheet, so host-page CSS
            (Tailwind resets, Bootstrap, legacy global rules) can never bleed in or out.
            Paste the snippet anywhere before <code className="font-mono text-[12px]">&lt;/body&gt;</code>.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <pre className="overflow-x-auto rounded-2xl border border-border bg-[#0b0b0f] p-5 font-mono text-[12px] leading-relaxed text-[#e4e4e7] shadow-card">
{`<script type="text/javascript">
var _sz=_sz||{};
_sz.appId="YOUR_APP_ID";
// optional theming
// _sz.primaryColor="#7c3aed";   // launcher background, buttons, focus rings
// _sz.secondaryColor="#f59e0b"; // launcher icon
// _sz.accentColor="#ef4444";    // unread messages badge
// _sz.textColor="#1f2937";      // all widget text
// _sz.launcherIcon="sparkle";     // bubble | chat | sparkle | message | headset
(function(){
  var e=document.createElement("script");
  e.src="https://cdn.signalzen.com/signalzen.js";
  e.setAttribute("async","true");
  document.documentElement.firstChild.appendChild(e);
  var t=setInterval(function(){
    "undefined"!=typeof SignalZen&&(clearInterval(t),new SignalZen(_sz).load())
  },10)
})();
</script>`}
          </pre>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-sm font-semibold text-foreground">Isolation guarantees</div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>• Shadow DOM boundary — host CSS selectors do not match inside.</li>
              <li>• Host element pinned with <code className="font-mono">!important</code> layout & typography to ignore <code className="font-mono">* {`{}`}</code> rules.</li>
              <li>• Inter font loaded once into the host document so the shadow can render it.</li>
              <li>• Single ~81&nbsp;kB gzipped bundle, no peer dependencies.</li>
            </ul>
            <a
              href="/index.html"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-subtle"
            >
              Open hostile-CSS demo →
            </a>
          </div>
        </div>
      </section>


      {/* Functionality matrix */}
      <section id="customize" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Functionality preserved
          </div>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
            Nothing taken away.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A redesign, not a new product. Every SignalZen capability still ships.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            "AI assistant",
            "Human agents",
            "AI → human handoff",
            "Live messaging",
            "Conversation history",
            "Suggested questions",
            "Help Center",
            "Rich article previews",
            "File upload",
            "Image upload",
            "Screenshot support",
            "Emoji picker",
            "Typing indicator",
            "Read status",
            "Visitor information",
            "Online / offline status",
            "Offline form",
            "Satisfaction rating",
            "Multiple languages",
            "Mobile responsive",
            "White-label support",
            "Theme customization",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-medium text-foreground"
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-foreground text-background">
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {f}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-5 w-5 place-items-center rounded-md bg-foreground text-background">
              <SparkleIcon className="h-2.5 w-2.5" />
            </div>
            SignalZen Widget · v2 concept
          </div>
          <div>A redesign in the spirit of Linear, Raycast, Arc, Apple, Notion.</div>
        </div>
      </footer>

      {/* Floating live widget */}
      <SignalzenWidget appId="YOUR_APP_ID" />
    </div>
  );
}
