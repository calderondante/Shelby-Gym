"use client";
import { useEffect, useRef } from "react";
/** Frequency gate: keyboard navigation and frequent data refreshes stay instant. */
export function InteractionMotion() {
  useEffect(() => {
    const pointer = () => {
      document.documentElement.dataset.input = "pointer";
    };
    const keyboard = () => {
      document.documentElement.dataset.input = "keyboard";
    };
    window.addEventListener("pointerdown", pointer, { passive: true });
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("pointerdown", pointer);
      window.removeEventListener("keydown", keyboard);
    };
  }, []);
  return null;
}
export function MotionStage({
  stage,
  children,
}: {
  stage: string | number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ block: "start", behavior: "instant" });
    el.querySelector<HTMLElement>("[data-step-heading]")?.focus({
      preventScroll: true,
    });
    if (
      document.documentElement.dataset.input === "keyboard" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const animation = el.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
    );
    return () => animation.cancel();
  }, [stage]);
  return (
    <div ref={ref} className="motion-stage">
      {children}
    </div>
  );
}
