/** The inbox and member list must identify the same unseen contribution updates. */
export const contributionNewsSql = `(w.state IN ('published','resolved','staff','needs-input','needs-changes') AND EXISTS (
  SELECT 1 FROM ops.explore_submission unseen WHERE unseen.work_id=w.id AND unseen.user_id=$1 AND w.updated_at>unseen.seen_at))`;
