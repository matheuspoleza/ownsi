import { STEPS } from "../Landing.constants.ts"

export const HowItWorks = () => (
  <ol className="flex flex-col gap-[22px]">
    {STEPS.map((step, index) => (
      <li key={step.title} className="flex gap-4">
        <span className="w-[26px] shrink-0 pt-[3px] font-mono text-[11.5px] text-muted-foreground tracking-[0.6px]">
          {`0${index + 1}`}
        </span>

        <div className="flex flex-col gap-[5px]">
          <h3 className="font-semibold text-[14.5px] text-foreground tracking-[-0.2px]">
            {step.title}
          </h3>
          <p className="font-body text-[13.5px] text-muted-foreground leading-[1.5]">{step.body}</p>
        </div>
      </li>
    ))}
  </ol>
)
