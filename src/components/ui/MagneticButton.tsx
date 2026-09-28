"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { armAudio, sonarPing } from "@/lib/audio";

const VARIANTS = {
  cyan: "bg-[linear-gradient(180deg,#7af6ff_0%,#00d4e4_100%)] text-[#041014] shadow-cyan",
  ghost: "glass text-white hover:border-white/20",
  amber: "bg-[linear-gradient(180deg,#ffd56a_0%,#ffb800_100%)] text-[#241800]",
  danger: "bg-[linear-gradient(180deg,#ff6d7d_0%,#ff2a42_100%)] text-white shadow-red",
};

export function MagneticButton({
  children,
  onClick,
  variant = "cyan",
  className = "",
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: keyof typeof VARIANTS;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 190, damping: 16, mass: 0.35 });
  const springY = useSpring(y, { stiffness: 190, damping: 16, mass: 0.35 });

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      onMouseMove={(event) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect || disabled) return;
        x.set((event.clientX - rect.left - rect.width / 2) * 0.28);
        y.set((event.clientY - rect.top - rect.height / 2) * 0.32);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={(event) => {
        if (disabled) return;
        armAudio();
        sonarPing(variant === "danger" ? 220 : variant === "amber" ? 480 : 740, 0.14, 0.05);
        const rect = ref.current?.getBoundingClientRect();
        if (rect && ref.current) {
          const ripple = document.createElement("span");
          ripple.className = "ripple";
          const size = Math.max(rect.width, rect.height);
          ripple.style.width = `${size}px`;
          ripple.style.height = `${size}px`;
          ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
          ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
          ref.current.appendChild(ripple);
          window.setTimeout(() => ripple.remove(), 700);
        }
        onClick?.();
      }}
      className={`relative isolate overflow-hidden rounded-full px-5 py-3 text-sm font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
