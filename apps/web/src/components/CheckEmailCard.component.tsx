import { AnimateIcon, MailIcon } from "@ownsi/ui"

export interface CheckEmailCardProps {
  email: string
  domain?: string
  onUseAnother: () => void
}

export const CheckEmailCard = ({ email, domain, onUseAnother }: CheckEmailCardProps) => (
  <div className="w-full max-w-[520px] overflow-hidden rounded-xl border border-border bg-card text-left shadow-[0_12px_32px_-18px_rgb(0_0_0/0.18)]">
    <div className="flex items-center gap-[9px] border-border border-b px-4 py-3">
      <AnimateIcon animateOnView loop loopDelay={2200}>
        <MailIcon className="size-[15px] shrink-0 text-foreground" strokeWidth={1.75} />
      </AnimateIcon>
      <span className="font-mono text-[12px] text-foreground">link sent</span>
      <span className="ml-auto truncate font-mono text-[11.5px] text-muted-foreground">
        {email}
      </span>
    </div>

    <div className="flex flex-col gap-[7px] px-4 py-[15px]">
      <h2 className="font-semibold text-[14.5px] text-foreground tracking-[-0.2px]">
        Check your email
      </h2>
      <p className="font-body text-[13.5px] text-muted-foreground leading-[1.5]">
        {domain
          ? `Open it and you land straight on the record for ${domain}, nothing else to do here.`
          : "Open it and you land straight on your domains, nothing else to do here."}
      </p>
    </div>

    <div className="flex items-center justify-between gap-3 bg-muted px-4 py-[13px]">
      <span className="font-mono text-[11.5px] text-muted-foreground">
        works in this browser or on your phone
      </span>

      <button
        type="button"
        onClick={onUseAnother}
        className="shrink-0 cursor-pointer font-medium text-[12.5px] text-foreground underline-offset-4 transition-opacity hover:underline active:opacity-70"
      >
        Use another one
      </button>
    </div>
  </div>
)
