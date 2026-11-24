import { expect, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { createTimelineFollow } from "../src/session/timeline/follow"

test("keeps each session's follow state while another session is selected", () => {
  const [key, setKey] = createSignal("a")

  const disposable = createRoot((dispose) => ({ dispose, follow: createTimelineFollow(key) }))
  const follow = disposable.follow

  try {
    // The reader presses in session A's timeline and scrolls up.
    follow.dispatch({ type: "pointer.down" })
    follow.dispatch({ type: "scroll.intent", upward: true, overflow: true })
    expect(follow.peek()).toEqual({ type: "detached", gesture: "pointer", endPending: false })

    // Another session starts out following.
    setKey("b")
    expect(follow.following()).toBe(true)

    // Session A is where its reader left it, without the pointer that was down when they left.
    setKey("a")
    expect(follow.peek()).toEqual({ type: "detached", endPending: false })
  } finally {
    disposable.dispose()
  }
})
