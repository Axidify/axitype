import { useState } from "react";
import { MAX_PROFILES, type ProfileRecord } from "../lib/profiles";
import styles from "./ProfileSwitcher.module.css";

interface ProfileSwitcherProps {
  profiles: ProfileRecord[];
  activeProfileId: string;
  onSwitch: (profileId: string) => void;
  onCreate: (name: string) => { ok: true } | { ok: false; error: string };
  onRename: (profileId: string, name: string) => { ok: true } | { ok: false; error: string };
  onDelete: (profileId: string) => { ok: true } | { ok: false; error: string };
}

export function ProfileSwitcher({
  profiles,
  activeProfileId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: ProfileSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "create" | "rename">("menu");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  const close = () => {
    setOpen(false);
    setMode("menu");
    setName("");
    setError(null);
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={styles.label}>Profile</span>
        <strong>{active?.name ?? "Player"}</strong>
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Profiles">
          {mode === "menu" && (
            <>
              <ul className={styles.list}>
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={p.id === activeProfileId ? styles.itemOn : styles.item}
                      onClick={() => {
                        onSwitch(p.id);
                        close();
                      }}
                    >
                      {p.name}
                      {p.id === activeProfileId ? " · active" : ""}
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={profiles.length >= MAX_PROFILES}
                  onClick={() => {
                    setMode("create");
                    setName("");
                    setError(null);
                  }}
                >
                  New profile
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setMode("rename");
                    setName(active?.name ?? "");
                    setError(null);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className={styles.danger}
                  disabled={profiles.length <= 1}
                  onClick={() => {
                    if (!active) return;
                    if (!window.confirm(`Delete profile “${active.name}”? This cannot be undone.`)) {
                      return;
                    }
                    const result = onDelete(active.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    close();
                  }}
                >
                  Delete
                </button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button type="button" className={styles.close} onClick={close}>
                Close
              </button>
            </>
          )}

          {(mode === "create" || mode === "rename") && (
            <>
              <p className={styles.formTitle}>{mode === "create" ? "New profile" : "Rename profile"}</p>
              <input
                className={styles.input}
                value={name}
                maxLength={24}
                autoFocus
                placeholder="Name"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setMode("menu");
                    setError(null);
                  }
                }}
              />
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setMode("menu");
                    setError(null);
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => {
                    const result =
                      mode === "create"
                        ? onCreate(name)
                        : onRename(activeProfileId, name);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    close();
                  }}
                >
                  {mode === "create" ? "Create" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
