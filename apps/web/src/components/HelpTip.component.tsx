import { Tooltip, TooltipContent, TooltipTrigger } from "@ownsi/ui"
import { CircleHelp } from "lucide-react"

export interface HelpTipProps {
  label: string
  children: string
}

export const HelpTip = ({ label, children }: HelpTipProps) => (
  <Tooltip>
    <TooltipTrigger
      type="button"
      aria-label={label}
      className="flex cursor-help items-center text-muted-foreground transition-colors hover:text-foreground"
    >
      <CircleHelp className="size-[13.5px]" strokeWidth={1.6} />
    </TooltipTrigger>
    <TooltipContent>{children}</TooltipContent>
  </Tooltip>
)
