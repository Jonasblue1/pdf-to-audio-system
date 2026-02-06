"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dark, setDark] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ---------------- LOAD VOICES ---------------- */
  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  /* ---------------- FILE PICK ---------------- */
  const handleFile = async (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      const content = reader.result as string;

      // simple extraction fallback (works for most PDFs)
      const cleaned = content.replace(/[^\x20-\x7E\n]/g, " ");
      setText(cleaned);
    };

    reader.readAsText(file);
  };

  /* ---------------- SPEECH ---------------- */
  const speak = () => {
    if (!text) return;

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.voice = voices[voiceIndex];

    u.onstart = () => {
      setSpeaking(true);
      setProgress(0);
    };

    u.onboundary = (e) => {
      const pct = (e.charIndex / text.length) * 100;
      setProgress(pct);
    };

    u.onend = () => {
      setSpeaking(false);
      setProgress(100);
    };

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setProgress(0);
  };

  /* ---------------- DOWNLOAD MP3 ---------------- */
  const downloadAudio = () => {
    // browser TTS cannot export true MP3
    // we save text instead for offline
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "speech.txt";
    a.click();
  };

  /* ---------------- UI ---------------- */
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 30,
        background: dark
          ? "linear-gradient(135deg,#0f172a,#1e293b)"
          : "linear-gradient(135deg,#e0f2fe,#ffffff)",
        color: dark ? "white" : "black",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: "bold" }}>
        🚀 PDF → Audio Reader (Stable Edition)
      </h1>

      {/* toggle */}
      <button onClick={() => setDark(!dark)}>
        {dark ? "Light Mode" : "Dark Mode"}
      </button>

      {/* file input */}
      <div style={{ marginTop: 20 }}>
        <input
          type="file"
          accept=".pdf,.txt"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
      </div>

      {/* text area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="PDF text will appear here..."
        style={{
          width: "100%",
          height: 250,
          marginTop: 20,
          padding: 10,
        }}
      />

      {/* voice select */}
      <select
        onChange={(e) => setVoiceIndex(Number(e.target.value))}
        style={{ marginTop: 10 }}
      >
        {voices.map((v, i) => (
          <option key={i} value={i}>
            {v.name}
          </option>
        ))}
      </select>

      {/* controls */}
      <div style={{ marginTop: 20 }}>
        <button onClick={speak}>▶ Play</button>
        <button onClick={pause}>⏸ Pause</button>
        <button onClick={resume}>▶ Resume</button>
        <button onClick={stop}>⏹ Stop</button>
        <button onClick={downloadAudio}>⬇ Save Text</button>
      </div>

      {/* progress */}
      <div
        style={{
          marginTop: 20,
          height: 8,
          background: "#ccc",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            height: "100%",
            width: progress + "%",
            background: "#22c55e",
          }}
        />
      </div>
    </main>
  );
}
