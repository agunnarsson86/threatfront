import { useEffect, useState, useRef } from 'react'

export function useVisibleItems(
  itemHeight: number,
  min: number = 1,
  max: number = 50
) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(min)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function calc() {
      const h = ref.current?.clientHeight ?? 0
      if (!h) return
      const n = Math.max(min, Math.min(max, Math.floor(h / itemHeight)))
      setCount(n)
    }

    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [itemHeight, min, max])

  return { ref, count }
}
