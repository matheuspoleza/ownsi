import { describe, expect, test } from "bun:test"
import { inProcessBroadcast } from "../../src/shared/broadcast.ts"

type Note = { readonly type: string }

const broadcasting = (heartbeatMs = 10_000) =>
  inProcessBroadcast<Note>({ heartbeat: () => ({ type: "heartbeat" }), heartbeatMs })

describe("the broadcast behind the stream", () => {
  test("the stream opens by saying it is alive", async () => {
    const broadcast = broadcasting()
    const stream = broadcast.subscribe("usr_ada")

    expect((await stream.next()).value).toEqual({ type: "heartbeat" })
    await stream.return(undefined)
  })

  test("an event reaches the account it belongs to", async () => {
    const broadcast = broadcasting()
    const stream = broadcast.subscribe("usr_ada")
    broadcast.publish("usr_ada", { type: "claim.ended" })

    await stream.next()
    expect((await stream.next()).value).toEqual({ type: "claim.ended" })
    await stream.return(undefined)
  })

  test("and reaches nobody else", async () => {
    const broadcast = broadcasting(20)
    const stream = broadcast.subscribe("usr_ada")
    broadcast.publish("usr_grace", { type: "claim.ended" })

    await stream.next()
    expect((await stream.next()).value).toEqual({ type: "heartbeat" })
    await stream.return(undefined)
  })

  test("a quiet connection is told it is still connected", async () => {
    const broadcast = broadcasting(5)
    const stream = broadcast.subscribe("usr_ada")

    expect((await stream.next()).value).toEqual({ type: "heartbeat" })
    expect((await stream.next()).value).toEqual({ type: "heartbeat" })
    await stream.return(undefined)
  })

  test("a stream that ends stops being written to", async () => {
    const broadcast = broadcasting()
    const stream = broadcast.subscribe("usr_ada")

    await stream.next()
    broadcast.publish("usr_ada", { type: "claim.ended" })
    await stream.next()
    await stream.return(undefined)

    expect(() => broadcast.publish("usr_ada", { type: "claim.ended" })).not.toThrow()
  })
})
