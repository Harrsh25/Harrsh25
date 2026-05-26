import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

const usePullToRefresh = ({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) => {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        e.preventDefault();
        setPullDistance(Math.min(dy * 0.5, threshold + 20));
        setPulling(dy > threshold);
      }
    };

    const onTouchEnd = async () => {
      if (pulling) {
        if (navigator.vibrate) navigator.vibrate(30);
        await onRefresh();
      }
      setPullDistance(0);
      setPulling(false);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, pulling, threshold]);

  return { containerRef, pulling, pullDistance };
};

export default usePullToRefresh;
