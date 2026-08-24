import { Card, Separator } from "@ownsi/ui"
import { Mail } from "lucide-react"

export interface CheckEmailCardProps {
  email: string
  domain?: string
  onUseAnother: () => void
}

export const CheckEmailCard = ({ email, domain, onUseAnother }: CheckEmailCardProps) => (
  <Card className="w-full max-w-[470px] p-[22px] text-left">
    <div className="flex flex-col gap-3">
      <Mail className="size-[22px] text-foreground" strokeWidth={1.75} />
      <h2 className="font-semibold text-base text-foreground">Check your email</h2>
      <p className="text-[13px] text-muted-foreground leading-[1.45]">
        We sent a link to {email}.{" "}
        {domain
          ? `Open it and you land straight on the record for ${domain}, nothing else to do here.`
          : "Open it and you land straight on your domains, nothing else to do here."}
      </p>

      <Separator className="my-[5px]" />

      <p className="text-[12px] text-muted-foreground">
        The link carries the claim, so it works in this browser or on your phone.
      </p>

      <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        Wrong address?
        <button
          type="button"
          onClick={onUseAnother}
          className="cursor-pointer font-medium text-foreground underline-offset-4 transition-opacity hover:underline active:opacity-70"
        >
          Use another one
        </button>
      </p>
    </div>
  </Card>
)
