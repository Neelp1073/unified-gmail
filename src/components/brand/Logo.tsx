export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="currentColor" className="text-accent" />
      <path
        d="M8.5 13.2c0-.9.7-1.6 1.6-1.6h11.8c.9 0 1.6.7 1.6 1.6v8.1c0 .9-.7 1.6-1.6 1.6H10.1c-.9 0-1.6-.7-1.6-1.6v-8.1Z"
        fill="white"
        fillOpacity="0.96"
      />
      <path
        d="M9 12.4 16 17.2 23 12.4"
        stroke="#4F46E5"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="dark:stroke-[#312e81]"
      />
    </svg>
  );
}
