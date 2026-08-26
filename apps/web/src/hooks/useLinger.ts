import { useEffect, useState } from "react"

/** True while the thing is open, and on for as long as its closing still has to play. */
export const useLinger = (open: boolean, closingMs: number): boolean => {
  const [lingering, setLingering] = useState(open)

  useEffect(() => {
    if (open) {
      setLingering(true)
      return
    }

    const timer = setTimeout(() => setLingering(false), closingMs)
    return () => clearTimeout(timer)
  }, [open, closingMs])

  return open || lingering
}
