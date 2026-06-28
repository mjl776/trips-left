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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, lineup]));
}
