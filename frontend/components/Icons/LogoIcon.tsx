import { FC } from "react";

interface LogoIconProps {
  size?: number;
  className?: string;
}

/**
 * Goalpost mark (spec §4). Drawn on a 24×24 grid: crossbar from x=1 to x=23 at
 * y=8, uprights rising from each end of the crossbar to y=1, stem at x=12 down
 * to y=23. The uprights share the crossbar's end points so they stay centered
 * at any rendered size.
 */
export const LogoIcon: FC<LogoIconProps> = ({ size = 24, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="M1 1V8H23V1" />
    <path d="M12 8V23" />
  </svg>
);
