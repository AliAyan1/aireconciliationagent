import Link from "next/link";
import type { ReactNode } from "react";

type AnimatedBorderButtonProps = {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  children: ReactNode;
};

export function AnimatedBorderButton({
  href,
  onClick,
  disabled,
  type = "button",
  className = "",
  children,
}: AnimatedBorderButtonProps) {
  const inner = (
    <span className="btn-gradient-spin-inner px-8 py-3.5 text-base font-semibold text-white sm:py-3.5">
      {children}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`btn-gradient-spin inline-block w-full sm:w-auto ${className}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-gradient-spin ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {inner}
    </button>
  );
}
