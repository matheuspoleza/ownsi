export type MapStory = "checking" | "proven"

export interface Vantage {
  x: number
  y: number
  silent?: true
}

export const GRID_SNAPPED_VANTAGES: readonly Vantage[] = [
  { x: 0.17306, y: 0.28538 },
  { x: 0.28833, y: 0.28538 },
  { x: 0.36528, y: 0.75 },
  { x: 0.50639, y: 0.21462, silent: true },
  { x: 0.53194, y: 0.21462, silent: true },
  { x: 0.58333, y: 0.78538 },
  { x: 0.71167, y: 0.42846, silent: true },
  { x: 0.78833, y: 0.60692 },
  { x: 0.89111, y: 0.28538 },
  { x: 0.91667, y: 0.78538 },
]

export const VISIBLE_BAND = { top: 0.195, bottom: 0.805 }

export const SPEAKING_VANTAGES = GRID_SNAPPED_VANTAGES.flatMap((vantage, index) =>
  vantage.silent || vantage.y < VISIBLE_BAND.top || vantage.y > VISIBLE_BAND.bottom ? [] : [index],
)

export const HANGS_BELOW_ABOVE_Y = 0.32

const MAP_MAX_WIDTH_PX = 1440
const MAP_VIEWBOX_WIDTH = 360
const GRID_DOT_DIAMETER_UNITS = 1.8
const GRID_DOT_DIAMETER_PX = (MAP_MAX_WIDTH_PX / MAP_VIEWBOX_WIDTH) * GRID_DOT_DIAMETER_UNITS

export const MARKER_SIZE_PX = Math.ceil(GRID_DOT_DIAMETER_PX)

export const RESOLVERS = ["cloudflare", "google", "quad9"] as const

export const ASK_MS = 2400
export const LOCK_MS = 3400
export const BEATS = RESOLVERS.length + 1
export const AGREED_BEAT = RESOLVERS.length
