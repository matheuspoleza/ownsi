export interface DomainSuggestion {
  domain: string
  /** The run of the name the person has typed, drawn between what surrounds it. */
  before: string
  match: string
  after: string
}

const whole = (domain: string): DomainSuggestion => ({
  domain,
  before: "",
  match: domain,
  after: "",
})

export const suggestionsFor = (
  domains: readonly string[],
  value: string,
): readonly DomainSuggestion[] => {
  const wanted = value.trim().toLowerCase()
  if (wanted === "") return domains.map(whole)

  return domains.flatMap((domain) => {
    const at = domain.indexOf(wanted)
    if (domain === wanted || at < 0) return []

    return [
      {
        domain,
        before: domain.slice(0, at),
        match: domain.slice(at, at + wanted.length),
        after: domain.slice(at + wanted.length),
      },
    ]
  })
}

/**
 * `-1` is the typed name itself, so arrowing past either end of the list lands back on it.
 */
export const stepThrough = (active: number, count: number, by: number): number =>
  ((active + 1 + by + count + 1) % (count + 1)) - 1
