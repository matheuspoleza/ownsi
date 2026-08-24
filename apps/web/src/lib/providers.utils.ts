import { PROVIDER_NAMES, type ProviderId } from "./providers.constants.ts"

export const providerName = (id: ProviderId): string => PROVIDER_NAMES[id] ?? PROVIDER_NAMES.other
