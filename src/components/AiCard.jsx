import { useEffect, useRef, useState } from "react";
import { Sparkles, Check, X, AlertTriangle, Trash2, KeyRound } from "lucide-react";
import { C, MONO, SectionTitle, Card, Button } from "../theme.jsx";
import { getPref, setPref, delPref } from "../db/db.js";
import { AI_ENABLED_PREF, AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { testApiKey } from "../lib/aiFeedback.js";

/**
 * Where the owner turns the AI feature on (brief §9): off by default, enabled explicitly, with the
 * spend cap acknowledged before a key can be saved.
 *
 * The acknowledgement is a gate rather than a stored consent record — §3 makes the cap the
 * condition of the whole accepted risk, so re-enabling asks again rather than remembering that it
 * was once ticked. The key's value is never rendered back, only its presence.
 */

const CONSOLE_URL = "https://console.anthropic.com/settings/limits";

export default function AiCard() {
  const [enabled, setEnabled] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [capAcknowledged, setCapAcknowledged] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const abort = useRef(null);

  useEffect(() => {
    (async () => {
      const [on, key] = await Promise.all([getPref(AI_ENABLED_PREF), getPref(AI_API_KEY_PREF)]);
      setEnabled(on === true);
      setHasKey(typeof key === "string" && key.trim() !== "");
      setLoaded(true);
    })();
    return () => abort.current?.abort();
  }, []);

  async function save() {
    const key = keyInput.trim();
    // A key already on the device may be turned back on without retyping it; a typed one replaces it.
    if (!capAcknowledged || (!key && !hasKey)) return;
    setError("");
    if (key) await setPref(AI_API_KEY_PREF, key);
    await setPref(AI_ENABLED_PREF, true);
    setKeyInput("");
    setCapAcknowledged(false);
    setHasKey(true);
    setEnabled(true);
    setNote("AI feedback is on. Open a Diario entry and tap Feedback.");
  }

  async function turnOff() {
    setNote("");
    setError("");
    await setPref(AI_ENABLED_PREF, false);
    setEnabled(false);
    setNote("AI feedback is off. The key is still on this device.");
  }

  async function removeKey() {
    setNote("");
    setError("");
    await delPref(AI_API_KEY_PREF);
    await setPref(AI_ENABLED_PREF, false);
    setConfirmRemove(false);
    setHasKey(false);
    setEnabled(false);
    setNote("Key removed from this device.");
  }

  async function checkKey() {
    setTesting(true);
    setNote("");
    setError("");
    abort.current = new AbortController();
    try {
      const key = await getPref(AI_API_KEY_PREF);
      await testApiKey({ apiKey: key, signal: abort.current.signal });
      setNote("The key works.");
    } catch (err) {
      if (err?.name !== "AbortError") setError(err.message);
    } finally {
      setTesting(false);
      abort.current = null;
    }
  }

  if (!loaded) return null;

  const on = enabled && hasKey;

  return (
    <>
      <SectionTitle>AI feedback</SectionTitle>
      <Card>
        <div className="flex items-start gap-2">
          <Sparkles size={16} style={{ color: on ? C.green : C.mut, marginTop: 2 }} />
          <div className="text-sm" style={{ color: C.ink }}>
            {on
              ? "On. A Feedback button appears on Diario entries."
              : "Claude can review a Diario entry when you ask it to."}
          </div>
        </div>

        <div className="mt-2 text-xs leading-relaxed" style={{ color: C.mut }}>
          Only that entry's title and text are sent, only to Anthropic, and only when you tap the
          button. Nothing is saved — the feedback disappears when you leave the entry.
        </div>

        {on ? (
          <>
            <div className="mt-2 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
              key saved on this device
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button tone="quiet" onClick={checkKey} disabled={testing}>
                <KeyRound size={15} className={testing ? "animate-pulse" : ""} /> Test key
              </Button>
              <Button tone="quiet" onClick={turnOff}>
                <X size={15} /> Turn off
              </Button>
              <Button
                tone={confirmRemove ? "dangerArmed" : "danger"}
                onClick={() => (confirmRemove ? removeKey() : setConfirmRemove(true))}
              >
                <Trash2 size={14} /> {confirmRemove ? "Tap again to remove" : "Remove key"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-3 text-xs leading-relaxed rounded-lg p-2.5" style={{ background: C.penPale, color: C.penDark }}>
              The key is stored in this browser, where code running on the page can read it — an
              accepted risk for a notebook with one owner, on the condition that a spend cap bounds
              what a leak could cost. Backups never include the key, so after restoring one you
              will enter it again.
            </div>

            <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed" style={{ color: C.ink }}>
              <input
                type="checkbox"
                className="mt-0.5 shrink-0"
                checked={capAcknowledged}
                onChange={(e) => setCapAcknowledged(e.target.checked)}
              />
              <span>
                I have set a hard monthly spend cap in the{" "}
                <a href={CONSOLE_URL} target="_blank" rel="noreferrer" style={{ color: C.pen, textDecoration: "underline" }}>
                  Anthropic console
                </a>
                .
              </span>
            </label>

            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-label={hasKey ? "Replace the saved Anthropic API key" : "Anthropic API key"}
              placeholder={hasKey ? "sk-ant-… (leave blank to keep the saved key)" : "sk-ant-…"}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="mt-3 w-full min-h-11 rounded-lg px-3 text-sm"
              style={{ fontFamily: MONO, color: C.ink, background: C.paper, border: `1px solid ${C.line}` }}
            />

            <div className="mt-3">
              <Button onClick={save} disabled={!capAcknowledged || (!keyInput.trim() && !hasKey)}>
                <Sparkles size={15} /> {hasKey ? "Turn on" : "Save key and turn on"}
              </Button>
            </div>
          </>
        )}

        {note && (
          <div className="mt-3 text-xs rounded-lg p-2.5 flex items-start gap-1.5" style={{ background: C.greenPale, color: C.green }}>
            <Check size={13} className="shrink-0 mt-0.5" /> {note}
          </div>
        )}
        {error && (
          <div className="mt-3 text-xs rounded-lg p-2.5 flex items-start gap-1.5" style={{ background: C.redPale, color: C.red }}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}
      </Card>
    </>
  );
}
