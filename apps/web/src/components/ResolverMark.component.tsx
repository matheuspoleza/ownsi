import type { ComponentProps } from "react"
import { RESOLVER_MARKS } from "./ResolverMark.constants.ts"

export type ResolverId = keyof typeof RESOLVER_MARKS

export type ResolverMarkProps = ComponentProps<"svg"> & {
  id: string
}

export const ResolverMark = ({ id, ...props }: ResolverMarkProps) => {
  const mark = RESOLVER_MARKS[id]
  if (!mark) return null

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={mark.title}
      fill={mark.hex}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>{mark.title}</title>
      <path d={mark.path} />
    </svg>
  )
}
