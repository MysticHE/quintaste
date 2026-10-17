import { LocalServiceError, withLocalStore } from "../local-explore/store";
export type AvatarLedger = { day: string; global: number; owners: Record<string, number>; receipts: Record<string, string> };
export async function reserveAvatar(owner: string, requestId: string, jobId: string) {
  return withLocalStore(store => {
    const previous = store.avatarLedger;
    if (previous && (typeof previous.day !== "string" || !Number.isSafeInteger(previous.global) || previous.global < 0 ||
      !previous.owners || !previous.receipts || Object.values(previous.owners).some(value => !Number.isSafeInteger(value) || value < 0) ||
      Object.values(previous.receipts).some(value => typeof value !== "string"))) {
      throw new LocalServiceError(503, "Avatar allowance could not be verified.");
    }
    const day = new Date().toISOString().slice(0, 10);
    const ledger = store.avatarLedger?.day === day ? store.avatarLedger : { day, global: 0, owners: {}, receipts: {} };
    const receipt = owner + ":" + requestId;
    if (ledger.receipts[receipt]) return ledger.receipts[receipt];
    if (ledger.global + 4 > 20 || (ledger.owners[owner] || 0) + 4 > 8) throw new LocalServiceError(429, "Today's avatar limit has been reached. Try again tomorrow.");
    ledger.global += 4; ledger.owners[owner] = (ledger.owners[owner] || 0) + 4;
    ledger.receipts[receipt] = jobId; store.avatarLedger = ledger;
    return jobId;
  });
}
