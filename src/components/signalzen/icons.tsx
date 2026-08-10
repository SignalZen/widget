import type { SVGProps } from "react";

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const SparkleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 3 13.8 9.2 20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z" />
    <path d="M19 3v3M5 18v3M21 5h-3M6 19H3" />
  </svg>
);

export const SendIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m5 12 14-7-4 16-3-7-7-2Z" />
  </svg>
);

export const PaperclipIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m21 11-8.5 8.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 1 1-3-3l8-8" />
  </svg>
);

export const SmileIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <path d="M9 9h.01M15 9h.01" />
  </svg>
);

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const ArrowLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const ArrowRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const XIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const MinusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
  </svg>
);

export const ExpandIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10" />
  </svg>
);

export const ChatIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
  </svg>
);

export const BookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z" />
    <path d="M4 17a3 3 0 0 1 3-3h12" />
  </svg>
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);

export const CheckDoubleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m2 12 5 5 9-11M11 17l1.2 1L21 7" />
  </svg>
);

export const ThumbUpIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M7 22V11M7 11l4-8a3 3 0 0 1 3 3v3h5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 17.6 22H7Z" />
  </svg>
);

export const ThumbDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M17 2v11M17 13l-4 8a3 3 0 0 1-3-3v-3H5a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 6.4 2H17Z" />
  </svg>
);

export const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="m12 3 2.7 5.7L21 9.6l-4.5 4.4L17.6 21 12 17.8 6.4 21l1.1-7L3 9.6l6.3-.9L12 3Z" />
  </svg>
);

export const ImageIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="m21 16-5-5-9 9" />
  </svg>
);

export const FileIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
    <path d="M14 3v5h5" />
  </svg>
);

export const CameraIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const DotIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} viewBox="0 0 8 8" {...p}>
    <circle cx="4" cy="4" r="3" fill="currentColor" stroke="none" />
  </svg>
);

export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const ExternalIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5M14 4h6v6M10 14 20 4" />
  </svg>
);

export const DownloadIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M12 4v12m0 0 4-4m-4 4-4-4M4 20h16" />
  </svg>
);

export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6" />
  </svg>
);

export const MailIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="m2 7 8.3 5.8a2 2 0 0 0 2.4 0L22 7" />
  </svg>
);

import type { LauncherIconName } from "./screens/types";
export type { LauncherIconName };

export function LauncherBubbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M5 3.5h14a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-7.3l-4.2 3.2a.9.9 0 0 1-1.45-.72V17.5H5A2.5 2.5 0 0 1 2.5 15V6A2.5 2.5 0 0 1 5 3.5Z" />
      <circle cx="8.25" cy="10.5" r="1.35" fill="currentColor" fillOpacity="0.35" />
      <circle cx="12" cy="10.5" r="1.35" fill="currentColor" fillOpacity="0.55" />
      <circle cx="15.75" cy="10.5" r="1.35" fill="currentColor" fillOpacity="0.85" />
    </svg>
  );
}

export function LauncherChatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L4 20l1-4.2A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  );
}

export function LauncherSparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3 13.8 9.2 20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z" />
    </svg>
  );
}

export function LauncherMessageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H12l-4.6 3.6A.8.8 0 0 1 6 19V16h-.5A1.5 1.5 0 0 1 4 14.5v-9Z" />
    </svg>
  );
}

export function LauncherHeadsetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 14v-2a8 8 0 1 1 16 0v2" />
      <rect x="3" y="13" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="17" y="13" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
      <path d="M20 19a4 4 0 0 1-4 4h-2" />
    </svg>
  );
}

// Old-widget icon set — exact SVG paths from the original RootButton.js
export function LauncherSzV1Icon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M256 32C114.6 32 .0272 125.1 .0272 240c0 49.63 21.35 94.98 56.97 130.7c-12.5 50.37-54.27 95.27-54.77 95.77c-2.25 2.25-2.875 5.734-1.5 8.734C1.979 478.2 4.75 480 8 480c66.25 0 115.1-31.76 140.6-51.39C181.2 440.9 217.6 448 256 448c141.4 0 255.1-93.13 255.1-208S397.4 32 256 32z"
      />
    </svg>
  );
}

export function LauncherSzV2Icon({ className }: { className?: string }) {
  // viewBox adds equal 10-unit margin above (y=0) and below (y=120 tail tip) so the
  // icon's visual center aligns with the SVG box center under preserveAspectRatio meet.
  return (
    <svg
      viewBox="0 -10 122 140"
      aria-hidden="true"
      className={className}
      style={{ overflow: "visible", marginLeft: "2px" }}
    >
      <path
        fill="currentColor"
        d="M112.15,51.92c0-28.68-25.14-51.93-56.15-51.93c-31.01,0-56.15,23.25-56.15,51.93c0,27.55,23.2,50.08,52.52,51.81c1.34,6.13,2.87,16.4,3.92,16.29c2.05-0.23,15.81-14.17,23.94-21.24c-0.09-0.04,0.01-0.03,0.04-0.02C99.13,90.38,112.15,72.56,112.15,51.92z M33.92,57.81c-3.1,0-5.61-2.51-5.61-5.61s2.51-5.61,5.61-5.61c3.1,0,5.61,2.51,5.61,5.61S37.02,57.81,33.92,57.81z M55.9,57.81c-3.1,0-5.61-2.51-5.61-5.61s2.51-5.61,5.61-5.61c3.1,0,5.61,2.51,5.61,5.61S59,57.81,55.9,57.81z M78.55,57.81c-3.1,0-5.61-2.51-5.61-5.61s2.51-5.61,5.61-5.61c3.1,0,5.61,2.51,5.61,5.61S81.65,57.81,78.55,57.81z"
      />
    </svg>
  );
}

export function LauncherSzV3Icon({ className }: { className?: string }) {
  // Same equal-margin approach: icon range y=0→~101, margin 10 on each side.
  return (
    <svg
      viewBox="0 -10 122 121"
      aria-hidden="true"
      className={className}
      style={{ overflow: "visible" }}
    >
      <path
        fill="currentColor"
        d="M112.24,83.82c-2.76-1.91-6.05-3.96-7.84-6.78c10.88-8.17,17.6-19.4,17.6-31.79C122,20.26,94.69,0,61,0C27.31,0,0,20.26,0,45.25C0,70.24,27.31,90.5,61,90.5c7.34,0,14.37-0.96,20.88-2.72c4.13,3.02,8.51,5.67,13.13,7.85c5.18,2.44,10.65,4.62,16.42,5.01c2.62,0.18,5.98,0.09,8.34-1.21c2.79-1.54,2.63-4.53,1.3-7.03C119.11,88.69,115.61,86.15,112.24,83.82z M29.98,57.01c-5.71,0-10.35-4.63-10.35-10.35s4.63-10.35,10.35-10.35s10.35,4.63,10.35,10.35S35.69,57.01,29.98,57.01z M57.72,57.01c-5.71,0-10.35-4.63-10.35-10.35s4.63-10.35,10.35-10.35s10.35,4.63,10.35,10.35S63.44,57.01,57.72,57.01z M85.25,57.01c-5.71,0-10.35-4.63-10.35-10.35s4.63-10.35,10.35-10.35s10.35,4.63,10.35,10.35S90.96,57.01,85.25,57.01z"
      />
    </svg>
  );
}

export function renderLauncherIcon(name: LauncherIconName | undefined, className: string) {
  switch (name) {
    case "sz-v1":
      return <LauncherSzV1Icon className={className} />;
    case "sz-v2":
      return <LauncherSzV2Icon className={className} />;
    case "sz-v3":
      return <LauncherSzV3Icon className={className} />;
    case "chat":
      return <LauncherChatIcon className={className} />;
    case "sparkle":
      return <LauncherSparkleIcon className={className} />;
    case "message":
      return <LauncherMessageIcon className={className} />;
    case "headset":
      return <LauncherHeadsetIcon className={className} />;
    case "bubble":
    default:
      return <LauncherBubbleIcon className={className} />;
  }
}
