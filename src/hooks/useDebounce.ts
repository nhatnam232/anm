import { useEffect, useState } from 'react'

/**
 * useDebounce - delays updating the returned value until after `delay` ms
 * have elapsed since the last change to `value`.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(query, 500)
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
