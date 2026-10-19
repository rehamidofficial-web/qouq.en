const PATHS = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1v-9" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10.5 5.2 8.2 4.5 4 4.5v14c4.2 0 6.5.7 8 2 1.5-1.3 3.8-2 8-2v-14c-4.2 0-6.5.7-8 2z" />
      <path d="M12 6.5v14" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
      <path d="M9 21h6" />
    </>
  ),
  stat: (
    <>
      <rect x="4" y="11" width="4" height="9" rx="1.2" />
      <rect x="10" y="4" width="4" height="16" rx="1.2" />
      <rect x="16" y="8" width="4" height="12" rx="1.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
