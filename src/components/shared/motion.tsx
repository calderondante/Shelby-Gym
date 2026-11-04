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
    // The mobile tab bar should not compete with the on-screen keyboard.
    // Pinch zoom is explicitly excluded; no layout reads or React renders on scroll.
    const viewport = window.visualViewport;
    const updateKeyboard = () => {
      const editing = document.activeElement?.matches(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]',
      );
      const open = Boolean(
        editing &&
        viewport &&
        viewport.scale === 1 &&
        window.innerHeight - viewport.height > 150,
      );
      document.documentElement.toggleAttribute("data-keyboard-open", open);
    };
    viewport?.addEventListener("resize", updateKeyboard);
    window.addEventListener("focusin", updateKeyboard);
    window.addEventListener("focusout", updateKeyboard);
    window.addEventListener("pointerdown", pointer, { passive: true });
    window.addEventListener("keydown", keyboard);
    return () => {
      viewport?.removeEventListener("resize", updateKeyboard);
      window.removeEventListener("focusin", updateKeyboard);
      window.removeEventListener("focusout", updateKeyboard);
      document.documentElement.removeAttribute("data-keyboard-open");
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
