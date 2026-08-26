import { useEffect, useState } from "react"
import { type DrawAvatar, loadAvatarDrawer } from "../lib/avatar.utils.ts"

const drawn = new Map<string, string>()

let drawer: Promise<DrawAvatar> | null = null

export const useAvatar = (seed: string): string | null => {
  const [drawing, setDrawing] = useState(() => drawn.get(seed) ?? null)

  useEffect(() => {
    const found = drawn.get(seed)
    if (found !== undefined) {
      setDrawing(found)
      return
    }

    let live = true
    drawer ??= loadAvatarDrawer()
    drawer.then((draw) => {
      const uri = draw(seed)
      drawn.set(seed, uri)
      if (live) setDrawing(uri)
    })

    return () => {
      live = false
    }
  }, [seed])

  return drawing
}
