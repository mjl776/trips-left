"use client";

import { FC, useId, useState } from "react";
import styles from "./page.module.css";
import { API_BASE_URL } from "@/lib/api";
import { STARTER_SLOTS } from "@/constants";
import type { League } from "@/types/LeagueTypes";
import { useToast } from "../ToastProvider";

type CreateLeagueStepProps = {
  onLeagueAttached: (league: League) => void;
};

const CreateLeagueStep: FC<CreateLeagueStepProps> = ({ onLeagueAttached }) => {
  const { showToast } = useToast();
  const inputId = useId();
  const hintId = useId();
  const [isCreatingMock, setIsCreatingMock] = useState(false);
  const [importId, setImportId] = useState("");
  const [importHint, setImportHint] = useState("Find the ID in your Sleeper league URL.");
  const [importError, setImportError] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleCreateMock = async () => {
    setIsCreatingMock(true);
    try {
      const response = await fetch(`${API_BASE_URL}/create-mock-league`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to create mock league");
      const league: League = await response.json();
      onLeagueAttached(league);
    } catch (error) {
      console.error(error);
      showToast({ variant: "error", title: "Couldn't create mock league" });
    } finally {
      setIsCreatingMock(false);
    }
  };

  const handleImport = async () => {
    const id = importId.trim();
    if (!/^[0-9]{6,}$/.test(id)) {
      setImportHint("That doesn't look like a Sleeper league ID — it's a long numeric string.");
      setImportError(true);
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/import-sleeper-league/${id}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setImportHint(data.message || "That league couldn't be found.");
        setImportError(true);
        return;
      }
      onLeagueAttached(data as League);
    } catch {
      setImportHint("Something went wrong reaching Sleeper.");
      setImportError(true);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Mock league</h3>
        <p className={styles.cardBody}>
          Sleeper&apos;s default scoring and a standard roster. Nothing to configure — settings are fixed once the
          league is created.
        </p>
        <div className={styles.chipRow}>
          {STARTER_SLOTS.map((slot, index) => (
            <span key={`${slot}-${index}`} className={styles.chip}>
              {slot}
            </span>
          ))}
          <span className={`${styles.chip} ${styles.chipMuted}`}>10 × BN</span>
        </div>
        <button type="button" className={styles.primaryButton} onClick={handleCreateMock} disabled={isCreatingMock}>
          {isCreatingMock ? "Creating..." : "Create mock league"}
        </button>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Import from Sleeper</h3>
        <p className={styles.cardBody}>
          Pulls the real scoring settings and roster positions from your league. Read-only — nothing is written back
          to Sleeper.
        </p>
        <label htmlFor={inputId} className={styles.srOnly}>
          Sleeper league ID
        </label>
        <div className={styles.importRow}>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            aria-describedby={hintId}
            aria-invalid={importError}
            value={importId}
            onChange={(event) => {
              setImportId(event.target.value);
              setImportHint("Find the ID in your Sleeper league URL.");
              setImportError(false);
            }}
            placeholder="Sleeper league ID"
            className={styles.importInput}
          />
          <button type="button" className={styles.importButton} onClick={handleImport} disabled={isImporting}>
            {isImporting ? "Importing..." : "Import"}
          </button>
        </div>
        <div
          id={hintId}
          aria-live="polite"
          className={`${styles.importHint} ${importError ? styles.importHintError : ""}`}
        >
          {importHint}
        </div>
      </div>
    </div>
  );
};

export default CreateLeagueStep;
