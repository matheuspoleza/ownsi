import { useEffect, useState } from "react"

export const useNow = (everyMs: number): number => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])

  return now
}
