/**
 * Ends everything between two members after a block: the friendship, open requests and upcoming or pending dinners.
 * Chat history stays but cannot be opened while they are not friends. Kept free of router imports so the community
 * block route can call it without an import cycle.
 */
export async function separate(db, a, b) {
  const [x, y] = a < b ? [a, b] : [b, a];
  await db.query('DELETE FROM social.friend WHERE a_id=$1 AND b_id=$2', [x, y]);
  await db.query(`UPDATE social.friend_request SET status='cancelled', decided_at=now() WHERE status='pending'
    AND ((from_id=$1 AND to_id=$2) OR (from_id=$2 AND to_id=$1))`, [a, b]);
  await db.query(`UPDATE social.dinner SET status='cancelled', cancelled_by=$1, updated_at=now() WHERE ((host_id=$1 AND guest_id=$2) OR (host_id=$2 AND guest_id=$1))
    AND (status='invited' OR (status='accepted' AND starts > now()))`, [a, b]);
}
