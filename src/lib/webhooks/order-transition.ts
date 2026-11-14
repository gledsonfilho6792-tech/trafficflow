// Replayed earlier lifecycle events must not undo an approved payment or refund.
export function canApplyOrderStatus(current: string, next: string) {
  if (
    next === "pending" &&
    ["paid", "refunded", "chargeback", "canceled"].includes(current)
  )
    return false;
  if (
    ["paid", "pending", "canceled"].includes(next) &&
    ["refunded", "chargeback"].includes(current)
  )
    return false;
  return true;
}
