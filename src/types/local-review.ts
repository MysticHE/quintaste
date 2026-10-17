export type LocalReviewRequest = (method?: string, value?: unknown, id?: string, endpoint?: "review" | "catalogue")
  => Promise<{ body: unknown; valid: () => boolean }>;
