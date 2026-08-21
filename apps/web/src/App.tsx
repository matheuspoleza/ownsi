import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "./lib/api.ts"

// Minimal vertical slice: front → Worker/proxy → Elysia → Postgres, plus one
// event dispatched to Inngest. The real UI starts on D5.
export function App() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.api.health.get()).data,
  })

  const claims = useQuery({
    queryKey: ["claims"],
    queryFn: async () => (await api.api.claims.get()).data,
  })

  const check = useMutation({
    mutationFn: async (id: string) => (await api.api.claims({ id }).check.post()).data,
  })

  return (
    <main className="mx-auto max-w-2xl p-10 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">ownsi</h1>
      <p className="mt-1 text-sm opacity-60">Prove what's yours.</p>

      <p className="mt-6 text-sm">
        API: <strong>{health.data?.status ?? "…"}</strong> · database:{" "}
        <strong>{health.data?.db ?? "…"}</strong>
      </p>

      <ul className="mt-6 divide-y divide-black/10 border-y border-black/10">
        {claims.data?.map((claim) => (
          <li key={claim.id} className="flex items-center justify-between gap-4 py-3">
            <span className="font-mono text-sm">{claim.domainAscii}</span>
            <span className="text-xs uppercase tracking-wide opacity-60">{claim.state}</span>
            <button
              type="button"
              onClick={() => check.mutate(claim.id)}
              className="rounded-md border border-black/15 px-3 py-1 text-xs hover:bg-black/5"
            >
              Check
            </button>
          </li>
        ))}
      </ul>

      {check.data && (
        <p className="mt-4 text-xs opacity-60">
          event sent to Inngest: <code>{check.data.eventId}</code>
        </p>
      )}
    </main>
  )
}
