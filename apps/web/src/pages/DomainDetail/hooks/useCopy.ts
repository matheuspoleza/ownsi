import { useEffect, useState } from "react"

export interface UseCopyResult {
  copied: boolean
  copy: () => void
}

const SETTLE_MS = 1600

export const useCopy = (value: string): UseCopyResult => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return

    const timer = setTimeout(() => setCopied(false), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [copied])

  return {
    copied,
    copy: () => {
      navigator.clipboard.writeText(value).then(
        () => setCopied(true),
        () => setCopied(false),
      )
    },
  }
}
