"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  RunArtifact,
  RunHistoryManifest,
  RunHistorySummary,
} from "@/logic/history/runHistory.types";
import styles from "./historyPage.module.css";

type ArtifactResponse = {
  ok: boolean;
  error?: string;
  artifact: RunArtifact;
  content: string;
  run: RunHistorySummary;
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadArtifact(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
}

export default function HistoryPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunHistorySummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunHistoryManifest | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [artifactResponse, setArtifactResponse] = useState<ArtifactResponse | null>(null);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isLoadingRun, setIsLoadingRun] = useState(false);
  const [isLoadingArtifact, setIsLoadingArtifact] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRuns() {
      setIsLoadingRuns(true);
      setPageError(null);

      try {
        const res = await fetch("/api/history");
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Failed to load version history.");
        }

        if (cancelled) return;
        const nextRuns = (json.runs ?? []) as RunHistorySummary[];
        setRuns(nextRuns);
        setSelectedRunId((current) => current ?? nextRuns[0]?.id ?? null);
      } catch (error) {
        if (cancelled) return;
        setPageError(error instanceof Error ? error.message : "Unexpected history error.");
      } finally {
        if (!cancelled) {
          setIsLoadingRuns(false);
        }
      }
    }

    void loadRuns();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      setSelectedArtifactId(null);
      setArtifactResponse(null);
      return;
    }

    let cancelled = false;

    async function loadRun() {
      setIsLoadingRun(true);
      setPageError(null);

      try {
        const res = await fetch(`/api/history/${selectedRunId}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Failed to load run.");
        }

        if (cancelled) return;
        const run = json.run as RunHistoryManifest;
        setSelectedRun(run);
        setSelectedArtifactId((current) =>
          current && run.artifacts.some((artifact) => artifact.id === current)
            ? current
            : run.artifacts[0]?.id ?? null
        );
      } catch (error) {
        if (cancelled) return;
        setPageError(error instanceof Error ? error.message : "Unexpected run load error.");
      } finally {
        if (!cancelled) {
          setIsLoadingRun(false);
        }
      }
    }

    void loadRun();

    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  useEffect(() => {
    if (!selectedRunId || !selectedArtifactId) {
      setArtifactResponse(null);
      return;
    }

    let cancelled = false;

    async function loadArtifact() {
      setIsLoadingArtifact(true);
      setPageError(null);

      try {
        const res = await fetch(`/api/history/${selectedRunId}/artifacts/${selectedArtifactId}`);
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Failed to load artifact.");
        }

        if (cancelled) return;
        setArtifactResponse(json as ArtifactResponse);
      } catch (error) {
        if (cancelled) return;
        setPageError(error instanceof Error ? error.message : "Unexpected artifact load error.");
      } finally {
        if (!cancelled) {
          setIsLoadingArtifact(false);
        }
      }
    }

    void loadArtifact();

    return () => {
      cancelled = true;
    };
  }, [selectedArtifactId, selectedRunId]);

  const selectedArtifact = useMemo(
    () => selectedRun?.artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null,
    [selectedArtifactId, selectedRun]
  );

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Run History</p>
          <h1>Version Control</h1>
          <p>
            Browse every generated run, inspect the stored artifacts at each step, and reopen the exact
            prompt, output, tokens, repairs, and export files for that run.
          </p>
        </div>

        <div className={styles.actions}>
          <button className="btn-neutral" type="button" onClick={() => router.push("/generate")}>
            Generate
          </button>
          <button className="btn-neutral" type="button" onClick={() => router.push("/preview")}>
            Preview
          </button>
          <button className="btn" type="button" onClick={() => router.push("/")}>
            Constraints
          </button>
        </div>
      </header>

      {pageError && (
        <section className={styles.notice}>
          <h2>History Notice</h2>
          <p>{pageError}</p>
        </section>
      )}

      <div className={styles.layout}>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Runs</h2>
            <span>{runs.length}</span>
          </div>

          {isLoadingRuns ? (
            <p className={styles.placeholder}>Loading stored runs...</p>
          ) : runs.length === 0 ? (
            <p className={styles.placeholder}>No runs have been stored yet.</p>
          ) : (
            <div className={styles.runList}>
              {runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className={`${styles.runCard} ${selectedRunId === run.id ? styles.runCardActive : ""}`}
                  onClick={() => setSelectedRunId(run.id)}
                >
                  <strong>{run.model}</strong>
                  <span>{formatDateTime(run.createdAt)}</span>
                  <span>{run.status}</span>
                  <span>{run.artifactCount} files</span>
                  <small>{run.themeDescription ?? "No description provided"}</small>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Artifacts</h2>
            {selectedRun && <span>{selectedRun.id}</span>}
          </div>

          {isLoadingRun ? (
            <p className={styles.placeholder}>Loading run details...</p>
          ) : !selectedRun ? (
            <p className={styles.placeholder}>Select a run to inspect its files.</p>
          ) : (
            <>
              <div className={styles.metaGrid}>
                <div>
                  <span>Created</span>
                  <strong>{formatDateTime(selectedRun.createdAt)}</strong>
                </div>
                <div>
                  <span>Updated</span>
                  <strong>{formatDateTime(selectedRun.updatedAt)}</strong>
                </div>
                <div>
                  <span>Mode</span>
                  <strong>{selectedRun.themeMode}</strong>
                </div>
                <div>
                  <span>Accessibility</span>
                  <strong>{selectedRun.accessibilityTarget}</strong>
                </div>
              </div>

              <div className={styles.artifactList}>
                {selectedRun.artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    className={`${styles.artifactRow} ${selectedArtifactId === artifact.id ? styles.artifactRowActive : ""}`}
                    onClick={() => setSelectedArtifactId(artifact.id)}
                  >
                    <div>
                      <strong>{artifact.label}</strong>
                      <span>{artifact.fileName}</span>
                    </div>
                    <div>
                      <span>{artifact.step}</span>
                      <span>{formatBytes(artifact.size)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>File Viewer</h2>
            {selectedArtifact && <span>{selectedArtifact.fileName}</span>}
          </div>

          {isLoadingArtifact ? (
            <p className={styles.placeholder}>Loading file contents...</p>
          ) : !artifactResponse ? (
            <p className={styles.placeholder}>Choose a file from the selected run.</p>
          ) : (
            <>
              <div className={styles.viewerToolbar}>
                <div>
                  <strong>{artifactResponse.artifact.label}</strong>
                  <span>{artifactResponse.artifact.mimeType}</span>
                </div>
                <button
                  className="btn-neutral"
                  type="button"
                  onClick={() =>
                    downloadArtifact(
                      artifactResponse.artifact.fileName,
                      artifactResponse.content,
                      artifactResponse.artifact.mimeType
                    )
                  }
                >
                  Download File
                </button>
              </div>
              <pre className={styles.viewer}>{artifactResponse.content}</pre>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
