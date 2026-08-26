import { cn } from "@ownsi/ui"

export interface PerforationProps {
  className?: string
}

export const Perforation = ({ className }: PerforationProps) => (
  <span
    aria-hidden
    className={cn(
      "block h-[3px] w-full bg-[length:7.5px_3px] bg-[radial-gradient(circle_at_center,var(--border)_1.25px,transparent_1.25px)]",
      className,
    )}
  />
)
