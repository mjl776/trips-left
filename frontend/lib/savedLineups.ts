const STORAGE_KEY = "savedLineups";

export type SavedLineup = {
  rosterId: string;
  leagueId: string;
  name: string;
  createdAt: string;
};

export function getSavedLineups(): SavedLineup[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveLineup(lineup: SavedLineup) {
  const existing = getSavedLineups();
  const index = existing.findIndex((entry) => entry.rosterId === lineup.rosterId);

  if (index === -1) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, lineup]));
    return;
  }

  const next = [...existing];
  next[index] = { ...lineup, createdAt: next[index].createdAt };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
