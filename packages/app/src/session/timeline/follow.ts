import { createMemo, createSignal, untrack, type Accessor } from "solid-js"
import {
  CONTACT_LOST_EVENT,
  createFollowState,
  followAnchor,
  isFollowing,
  transitionFollow,
  type FollowEvent,
  type FollowState,
} from "./machine"

// More than the timeline cache keeps views: a session whose view went can still have its place saved.
const KEPT_SESSIONS = 64

// Each session has its own machine, and its state is kept while another session is selected: a reader who had scrolled
// up comes back to their place, and one who followed comes back to the end. A session opened for the first time starts
// out following. Reading the state recomputes it for a changed key, so a view that mounts for a session starts from
// that session's state, whatever order the flush runs its computations in.
export function createTimelineFollow(sessionKey: Accessor<string>) {
  const kept = new Map<string, FollowState>()

  const machine = createMemo(() => {
    const key = sessionKey()

    // The reader's contact with the timeline ended when they left the session.
    return { key, signal: createSignal(transitionFollow(kept.get(key) ?? createFollowState(), CONTACT_LOST_EVENT)) }
  })

  const state = () => machine().signal[0]()
  const peek = () => untrack(state)
  const following = createMemo(() => isFollowing(state()))
  const anchor = createMemo(() => followAnchor(state()))
  let attempts = 0

  // The signal skips an unchanged state, which the transition returns as the same object.
  const dispatch = (event: FollowEvent) => {
    const current = untrack(machine)
    const previous = untrack(current.signal[0])
    const next = transitionFollow(previous, event)

    if (next === previous) return
    current.signal[1](next)
    kept.delete(current.key)
    kept.set(current.key, next)

    if (kept.size > KEPT_SESSIONS) kept.delete(kept.keys().next().value!)
  }

  return {
    state,
    peek,
    following,
    anchor,
    dispatch,
    /** Queues a return to the end and returns its attempt, which the frame that scrolls hands back in `return.run`. */
    beginReturn: () => {
      attempts += 1
      dispatch({ type: "return.start", attempt: attempts })

      return attempts
    },
  }
}

export type TimelineFollow = ReturnType<typeof createTimelineFollow>
