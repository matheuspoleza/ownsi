import { cn, OwnsiSentinel } from "@ownsi/ui"
import { useSentinelRig } from "../hooks/useSentinelRig.ts"

export interface SentinelProps {
  /** What is in the field right now. The sentinel watches the caret across it. */
  typed: string
  /** Where it stands, and how much of it the crop lets through. */
  className: string
}

export const Sentinel = ({ typed, className }: SentinelProps) => {
  const glyph = useSentinelRig(typed)

  return (
    <span
      aria-hidden
      className={cn("-scale-x-100 pointer-events-none absolute overflow-hidden", className)}
    >
      <OwnsiSentinel
        ref={glyph}
        className="absolute top-[-14px] left-[10px] h-[145px] w-[103px] origin-[50%_95px] text-foreground"
      />
    </span>
  )
}
