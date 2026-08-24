import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { sendMagicLink } from "../api/auth.api.ts"

export interface UseMagicLinkSendOptions {
  domain?: string
}

export interface UseMagicLinkSendResult {
  sentTo: string | null
  isSending: boolean
  hasFailed: boolean
  send: (email: string) => void
  useAnotherAddress: () => void
}

export const useMagicLinkSend = ({
  domain,
}: UseMagicLinkSendOptions = {}): UseMagicLinkSendResult => {
  const [sentTo, setSentTo] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (email: string) => sendMagicLink({ email, domain }),
    onSuccess: (result) => setSentTo(result.email),
  })

  return {
    sentTo,
    isSending: mutation.isPending,
    hasFailed: mutation.isError,
    send: mutation.mutate,
    useAnotherAddress: () => {
      setSentTo(null)
      mutation.reset()
    },
  }
}
