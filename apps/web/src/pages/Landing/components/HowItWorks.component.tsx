const STEPS = [
  {
    title: "Add one TXT record",
    body: "We give you the exact name and value, and the steps for your provider.",
  },
  {
    title: "We read it back",
    body: "From resolvers on six continents, and we show you what each one returned.",
  },
  {
    title: "You get a proof",
    body: "A link anyone can open, with the record, the time and the witnesses.",
  },
]

export const HowItWorks = () => (
  <ol className="grid gap-9 sm:grid-cols-3 sm:gap-6">
    {STEPS.map((step, index) => (
      <li key={step.title} className="flex flex-col items-center gap-[9px] text-center">
        <span className="flex size-6 items-center justify-center rounded-full border border-border font-medium text-[11px] text-muted-foreground">
          {index + 1}
        </span>
        <h3 className="font-semibold text-foreground text-sm leading-[1.45]">{step.title}</h3>
        <p className="max-w-[34ch] text-[13px] text-muted-foreground leading-[1.45]">{step.body}</p>
      </li>
    ))}
  </ol>
)
