import type { ReactNode } from "react";

interface IconProps {
  className?: string;
}

function makeIcon(paths: ReactNode) {
  return function Icon({ className = "size-6" }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={className}
      >
        {paths}
      </svg>
    );
  };
}

export const ArrowLeftIcon = makeIcon(<path d="M19 12H5m7 7-7-7 7-7" />);

export const UploadIcon = makeIcon(
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12" />,
);

export const CameraIcon = makeIcon(
  <>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
    <circle cx="12" cy="13" r="3" />
  </>,
);

export const ImagesIcon = makeIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
  </>,
);

export const VideoIcon = makeIcon(
  <>
    <path d="m22 8-6 4 6 4z" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </>,
);

export const PlayIcon = makeIcon(<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />);

export const CheckIcon = makeIcon(<path d="M20 6 9 17l-5-5" />);

export const AlertIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4m0 4h.01" />
  </>,
);

export const RetryIcon = makeIcon(
  <>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </>,
);

export const ArrowUpIcon = makeIcon(<path d="m5 12 7-7 7 7M12 19V5" />);
