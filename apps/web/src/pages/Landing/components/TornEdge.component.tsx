const FIBRES = [
  1.2, 4.4, 2.1, 5.3, 0.8, 3.6, 5.8, 2.4, 4.9, 1.5, 3.1, 5.5, 2.8, 0.9, 4.2, 1.8, 5.1, 3.3, 0.6,
  4.7, 2.2,
]
const SPAN = 10

const PATH = `M0 0 ${FIBRES.map((x, index) => `L${x} ${index * SPAN}`).join(" ")} L0 ${
  (FIBRES.length - 1) * SPAN
} Z`

export interface TornEdgeProps {
  className: string
  opacity: number
}

export const TornEdge = ({ className, opacity }: TornEdgeProps) => (
  <svg
    aria-hidden
    viewBox={`0 0 6 ${(FIBRES.length - 1) * SPAN}`}
    preserveAspectRatio="none"
    style={{ opacity }}
    className={`pointer-events-none absolute hidden w-[6px] transition-opacity duration-200 sm:block ${className}`}
  >
    <path d={PATH} fill="currentColor" />
  </svg>
)
