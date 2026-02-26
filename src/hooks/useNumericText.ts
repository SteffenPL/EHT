/**
 * Dual-state text<->number hook for numeric text inputs.
 * Manages local text state and syncs with prop value when not focused.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { parseNumericText, formatNumericValue } from '@/components/params/inputs/numericParse';

export interface UseNumericTextOptions {
  value: number;
  onChange: (value: number) => void;
  integer?: boolean;
  min?: number;
  max?: number;
}

export function useNumericText({ value, onChange, integer, min, max }: UseNumericTextOptions) {
  const [text, setText] = useState(() => formatNumericValue(value));
  const [isValid, setIsValid] = useState(true);
  const isFocused = useRef(false);

  // Sync text from prop when not focused
  useEffect(() => {
    if (!isFocused.current) {
      setText(formatNumericValue(value));
      setIsValid(true);
    }
  }, [value]);

  const clamp = useCallback((v: number): number => {
    let result = integer ? Math.round(v) : v;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }, [integer, min, max]);

  const handleChange = useCallback((newText: string) => {
    setText(newText);
    const parsed = parseNumericText(newText);
    if (parsed !== null) {
      setIsValid(true);
      onChange(clamp(parsed));
    } else {
      setIsValid(false);
      onChange(clamp(0));
    }
  }, [onChange, clamp]);

  const handleFocus = useCallback(() => {
    isFocused.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isFocused.current = false;
    // Revert to last valid value on blur
    setText(formatNumericValue(value));
    setIsValid(true);
  }, [value]);

  return { text, isValid, handleChange, handleFocus, handleBlur };
}
