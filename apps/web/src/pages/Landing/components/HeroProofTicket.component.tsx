import { DotWorldMap, OwnsiSeal } from "@ownsi/ui"
import type { ReactNode } from "react"
import { ProofQr } from "../../../components/ProofQr.component.tsx"
import { ProviderGlyph } from "../../../components/ProviderGlyph.component.tsx"
import { useProofTicketTear } from "../hooks/useProofTicketTear.ts"
import { TornEdge } from "./TornEdge.component.tsx"

export interface Proof {
  domain: string
  heldBy: string
  provedOn: string
  witnesses: string
  provider: string
  providerLabel: string
  token: string
  link: string
  expiresOn: string
}

export interface HeroProofTicketProps {
  proof: Proof
}

const TEAR = "repeating-linear-gradient(var(--tear-dir), #FFFFFF33 0 7px, transparent 7px 12px)"

const GLIDE = {
  idle: "transform 620ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity 320ms ease-in",
  hinting: "transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1)",
  pulling: "none",
  torn: "transform 480ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 400ms ease-out",
}

const HOVER_LIFT = "sm:hover:shadow-lg sm:hover:shadow-black/15"

const LIFT = {
  idle: HOVER_LIFT,
  hinting: "shadow-lg shadow-black/20",
  pulling: "shadow-2xl shadow-black/30",
  torn: "shadow-2xl shadow-black/30",
}

interface CellProps {
  label: string
  children: ReactNode
}

const Cell = ({ label, children }: CellProps) => (
  <div className="flex flex-col gap-[5px]">
    <dt className="font-medium text-[10.5px] text-white/50 tracking-[0.5px]">{label}</dt>
    <dd className="font-medium text-[13.5px]">{children}</dd>
  </div>
)

interface NotchProps {
  className: string
}

const Notch = ({ className }: NotchProps) => (
  <span
    aria-hidden
    className={`absolute hidden size-[22px] rounded-full bg-background sm:block ${className}`}
  />
)

export const HeroProofTicket = ({ proof }: HeroProofTicketProps) => {
  const tear = useProofTicketTear()
  const torn = tear.phase === "torn"
  const tilt = torn ? 8 : tear.progress * 2.4
  const tearing = tear.phase === "pulling" || tear.phase === "torn"
  const edgeOpacity = tearing ? Math.min(1, tear.pull / 8) : 0

  return (
    <article
      ref={tear.ref}
      className="relative flex w-full max-w-[660px] flex-col text-proof-foreground sm:flex-row"
    >
      <div className="relative flex-1 overflow-hidden rounded-t-2xl bg-proof px-7 py-6 sm:rounded-tr-none sm:rounded-bl-2xl">
        <DotWorldMap className="pointer-events-none absolute top-[22px] left-[-30px] h-[217px] w-[600px] text-white/[0.12] sm:left-auto sm:right-[-108px]" />
        <Notch className="-top-[11px] -right-[12px]" />
        <Notch className="-bottom-[11px] -right-[12px]" />

        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-[7px]">
              <OwnsiSeal className="h-[22px] w-[19px] text-proof-foreground" />
              <span className="font-semibold text-[13px]">ownsi</span>
            </span>
            <span className="font-medium text-[11px] text-white/70 tracking-[0.6px]">
              Proof of ownership
            </span>
          </div>

          <div className="pt-6">
            <p className="font-semibold text-[28px] leading-[1.15] tracking-[-0.9px] sm:text-[34px]">
              {proof.domain}
            </p>
            <p className="pt-[5px] text-[13px] text-white/70">held by&nbsp;&nbsp;{proof.heldBy}</p>
          </div>

          <dl className="grid grid-cols-3 pt-6 pb-[15px]">
            <Cell label="Proved">{proof.provedOn}</Cell>
            <Cell label="Witnesses">{proof.witnesses}</Cell>
            <Cell label="Provider">
              <span className="flex items-center gap-[7px]">
                <span className="flex size-[19px] shrink-0 items-center justify-center rounded-[5px] bg-white">
                  <ProviderGlyph provider={proof.provider} className="size-[11px]" />
                </span>
                {proof.providerLabel}
              </span>
            </Cell>
          </dl>

          <p className="border-white/20 border-t pt-[15px] font-mono text-[12px] text-white/70">
            {proof.token}
          </p>

          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-[opacity,transform] ${
              tear.stamped
                ? "scale-100 opacity-100 duration-150 ease-out"
                : "scale-[1.6] opacity-0 duration-500 ease-in"
            }`}
          >
            <span className="-rotate-[9deg] rounded-[7px] border-[2.5px] border-white/55 px-5 py-2.5 text-center">
              <span className="block font-semibold text-[16px] text-white/80 tracking-[4px]">
                ADMIT ONE
              </span>
              <span className="block pt-[3px] font-mono text-[9px] text-white/55 tracking-[1.5px]">
                one domain · one owner
              </span>
            </span>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="relative h-px w-full shrink-0 bg-proof [--tear-dir:to_right] sm:my-[11px] sm:h-auto sm:w-[2px] sm:[--tear-dir:to_bottom]"
        style={{ backgroundImage: TEAR }}
      >
        <TornEdge
          className="-top-[11px] left-full h-[calc(100%+22px)] text-proof"
          opacity={edgeOpacity}
        />
      </div>

      <div
        className="relative flex shrink-0 origin-left touch-pan-y sm:w-[196px] sm:cursor-grab sm:active:cursor-grabbing"
        style={{
          transform: `translateX(${tear.pull}px) rotate(${tilt}deg)`,
          opacity: torn ? 0 : 1,
          transition: GLIDE[tear.phase],
        }}
        onPointerDown={tear.onPointerDown}
        onPointerMove={tear.onPointerMove}
        onPointerUp={tear.onPointerUp}
        onPointerCancel={tear.onPointerUp}
      >
        <div
          className={`relative w-full select-none overflow-hidden rounded-b-2xl bg-proof px-5 py-6 transition-[translate,rotate,box-shadow] duration-[480ms] ease-out sm:rounded-tr-2xl sm:rounded-bl-none sm:hover:translate-x-[6px] sm:hover:rotate-[0.35deg] ${LIFT[tear.phase]}`}
        >
          <DotWorldMap className="pointer-events-none absolute top-[22px] right-[90px] hidden h-[217px] w-[600px] text-white/[0.12] sm:block" />
          <TornEdge className="top-0 left-0 h-full text-background" opacity={edgeOpacity} />
          <Notch className="-top-[11px] -left-[12px]" />
          <Notch className="-bottom-[11px] -left-[12px]" />

          <div className="relative flex flex-col items-start gap-3">
            <span className="flex size-[124px] items-center justify-center rounded-lg bg-white">
              <ProofQr className="size-[104px] text-proof" />
            </span>
            <p className="font-mono text-[10.5px] text-white/70">{proof.link}</p>
            <p className="flex items-center gap-1.5 text-[11px] text-white/70">
              <span className="size-1.5 rounded-full bg-white" />
              Link expires {proof.expiresOn}
            </p>
          </div>
        </div>
      </div>
    </article>
  )
}
