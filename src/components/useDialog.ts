"use client";

import { useEffect, useRef } from "react";

// 모달 접근성 동작을 DOM 구조 변경 없이 주입하는 훅.
// - ESC로 닫기
// - 마운트 시 컨테이너로 포커스 이동, 언마운트 시 이전 포커스 복원
// - Tab 포커스를 컨테이너 안에 가둠(포커스 트랩)
// 사용: const ref = useDialog(onClose); <div ref={ref} role="dialog" aria-modal="true"> ...
export function useDialog<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void
) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // 첫 포커스 가능한 요소로 이동(없으면 컨테이너 자체).
    const focusable = node?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable && focusable.length > 0) {
      focusable[0].focus();
    } else {
      node?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && node) {
        const items = node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return ref;
}
