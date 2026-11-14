/** Schedule initial browser work and cancel it when the effect is cleaned up. */
export function deferEffect(work: () => void) {
  let active = true
  queueMicrotask(() => { if (active) work() })
  return () => { active = false }
}
