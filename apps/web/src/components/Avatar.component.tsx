import { cn } from "@ownsi/ui"
import { useAvatar } from "../hooks/useAvatar.ts"
import { avatarGround } from "../lib/avatar.utils.ts"

export interface AvatarProps {
  seed: string
  title?: string
  className?: string
}

export const Avatar = ({ seed, title, className }: AvatarProps) => {
  const drawing = useAvatar(seed)

  return (
    <span
      title={title}
      className={cn("block shrink-0 overflow-hidden rounded-full", className)}
      style={{ backgroundColor: avatarGround(seed) }}
    >
      {drawing === null ? null : <img src={drawing} alt="" className="size-full" />}
    </span>
  )
}
