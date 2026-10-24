import { useEffect, useState, type RefObject } from "react";

/** True once the element has scrolled into view (latches; never flips back). */
export function useInView(ref: RefObject<Element | null>, enabled = true) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);
  return inView;
}

/** Layout size (ignores transforms, so rotated stamps and springing cards measure true). */
export function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
