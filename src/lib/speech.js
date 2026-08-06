/**
 * Reading Spanish aloud (Phase 7d).
 *
 * The browser's own speech synthesis, which costs nothing to store and sends nothing
 * anywhere: the voices are already on the device. That matters twice over — §13 rules out
 * a server, and the Attachment model is reserved, so recorded audio is not an option. This
 * speaks; it never records.
 *
 * Voice availability is a property of the device, not of this app. Android Chrome ships
 * Spanish voices; a stripped desktop browser may ship none. Where none exists the button
 * simply does not appear, which is why every function here answers honestly rather than
 * pretending.
 */

/**
 * Preference order for a Latin American notebook (§3): Mexican first, then the general
 * Latin American voice, then US Spanish, then anything Spanish at all rather than nothing.
 */
const PREFERRED = ["es-mx", "es-419", "es-us"];

const tag = (voice) => String(voice?.lang || "").toLowerCase().replace("_", "-");

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/**
 * The best Spanish voice in a list, or null when it holds none. Pure, so the preference
 * order can be tested without a browser that happens to have the right voices installed.
 */
export function pickSpanishVoice(voices) {
  const spanish = (voices || []).filter((voice) => tag(voice).startsWith("es"));
  if (!spanish.length) return null;

  for (const wanted of PREFERRED) {
    const match = spanish.find((voice) => tag(voice) === wanted);
    if (match) return match;
  }
  return spanish[0];
}

/**
 * Voices load asynchronously in most browsers: the first getVoices() often returns []
 * and a voiceschanged event follows. Callers get the answer whenever it arrives, and
 * the listener detaches itself so a screen that mounts often does not accumulate them.
 */
export function onSpanishVoice(callback) {
  if (!ttsSupported()) {
    callback(null);
    return () => {};
  }

  const synth = window.speechSynthesis;
  let done = false;

  const attempt = () => {
    if (done) return;
    const voice = pickSpanishVoice(synth.getVoices());
    // An empty list means "not loaded yet"; a loaded list without Spanish means "never".
    if (!voice && !synth.getVoices().length) return;
    done = true;
    synth.removeEventListener?.("voiceschanged", attempt);
    callback(voice);
  };

  attempt();
  if (!done) synth.addEventListener?.("voiceschanged", attempt);

  return () => {
    done = true;
    synth.removeEventListener?.("voiceschanged", attempt);
  };
}

/**
 * Speaks one piece of Spanish, cancelling anything already in progress — tapping a second
 * word should replace the first, not queue behind it. Returns whether it spoke.
 */
export function speakSpanish(text, voice = null) {
  const said = String(text || "").trim();
  if (!ttsSupported() || !said) return false;

  const synth = window.speechSynthesis;
  const utterance = new window.SpeechSynthesisUtterance(said);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "es-MX";
  }

  synth.cancel();
  synth.speak(utterance);
  return true;
}
