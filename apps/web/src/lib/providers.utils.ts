import {
  PROVIDER_INSTRUCTIONS,
  PROVIDER_NAMES,
  type ProviderId,
  type ProviderInstruction,
} from "./providers.constants.ts"

export const providerName = (id: ProviderId): string => PROVIDER_NAMES[id] ?? PROVIDER_NAMES.other

export const providerInstruction = (id: ProviderId): ProviderInstruction =>
  PROVIDER_INSTRUCTIONS[id] ?? PROVIDER_INSTRUCTIONS.other
