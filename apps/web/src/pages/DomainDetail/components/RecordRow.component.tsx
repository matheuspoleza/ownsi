import { Button } from "@ownsi/ui"
import { Check, Copy } from "lucide-react"
import { useCopy } from "../../../hooks/useCopy.ts"

export interface RecordRowProps {
  label: string
  value: string
  copyable?: boolean
}

export const RecordRow = ({ label, value, copyable = false }: RecordRowProps) => {
  const { copied, copy } = useCopy(value)

  return (
    <div className="flex items-center gap-3 border-border border-b px-3.5 py-2 last:border-b-0">
      <span className="w-24 shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">{value}</span>

      <span className="flex w-[86px] shrink-0 justify-end">
        {copyable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={copy}
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            {copied ? <Check className="text-success" /> : <Copy />}
            Copy
          </Button>
        ) : null}
      </span>
    </div>
  )
}
