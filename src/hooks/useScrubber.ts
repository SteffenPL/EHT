/**
 * Label drag-to-scrub hook for exponential value adjustment.
 * Attach returned props to a label element to enable drag scrubbing.
 */
import { useCallback, useRef } from 'react';

export interface UseScrubberOptions {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  integer?: boolean;
  min?: number;
  max?: number;
  sensitivity?: number;
}

export function useScrubber({
  value,
  onChange,
  disabled,
  integer,
  min,
  max,
  sensitivity = 1,
}: UseScrubberOptions) {
  const startX = useRef(0);
  const startValue = useRef(0);

  const clamp = useCallback((v: number): number => {
    let result = integer ? Math.round(v) : v;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }, [integer, min, max]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    if (!isFinite(value)) return; // No-op for infinity

    e.preventDefault();
    startX.current = e.clientX;
    startValue.current = value;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX.current;
      const epsilon = 1e-6;

      let newValue: number;
      if (Math.abs(startValue.current) < epsilon) {
        // Linear additive mode near zero
        newValue = startValue.current + dx * 0.01 * sensitivity;
      } else {
        // Exponential scaling
        newValue = startValue.current * Math.pow(1.01, dx * sensitivity);
      }

      onChange(clamp(newValue));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [value, onChange, disabled, clamp, sensitivity]);

  return {
    scrubberProps: {
      onMouseDown,
      style: { cursor: disabled ? undefined : 'ew-resize', userSelect: 'none' as const },
    },
  };
}
