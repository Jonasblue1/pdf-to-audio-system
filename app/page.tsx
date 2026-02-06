"use client";

import { useEffect, useRef, useState } from "react";

export default function Page() {
  /* ---------------- STATE ---------------- */

  const [text, setText] = useState("");
  const [chunks, setChunks] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const [progress, setProgress] = useState(0);
  const [dark, setDark] = useState(false);
  const [playing, setPlaying] = useState(false);

  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ---------------- THEME ---------------- */

  useEffect(() => {
    document.body.style.background = dark ? "#0f172a" : "#ffffff";
    document.body.style.color = dark ? "white" : "black";
  }, [dark]);

  /* ---------------- FILE READ ---------------- */

  const handleFile = async (file: File) => {
    setProgress(10);

    const buffer = await file.arrayBuffer();

    // simple text extraction
    const decoder = new TextDecoder("utf-8");
    let raw = decoder.decode(buffer);

    setProgress(40);

    // remove weird binary symbols
    raw = raw.replace(/[^\x20-\x7E\n]/g, " ");

    setProgress(70);

    setText(raw);

    const split = raw.match(/.{1,600}/g) || [];
    setChunks(split);

    setProgress(100);
  };

  /* ---------------- DRAG DROP ---------------- */

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  /* ---------------- SPEECH ---------------- */

  const speakChunk = (i: number) => {
    if (!chunks[i]) return;

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(chunks[i]);
    utter.rate = 1;
    utter.pitch = 1;

    utter.onend = () => {
      if (i + 1 < chunks.length && playing) {
        setIndex(i + 1);
        speakChunk(i + 1);
      }
    };

    synthRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const play = () => {
    if (!chunks.length) return;
    setPlaying(true);
    speakChunk(index);
  };

  const pause = () => {
    window.speechSynthesis.pause();
  };

  const resume = () => {
    window.speechSynthesis.resume();
  };

  const stop = () => {
    setPlaying(false);
    window.speechSynthesis.cancel();
  };

  /* ---------------- BOOKMARK ---------------- */

  const bookmark = () => {
    localStorage.setItem("bookmark", String(index));
    alert("Bookmark saved");
  };

  const resumeBookmark = () => {
    const saved = localStorage.getItem("bookmark");
    if (!saved) return;

    const i = parseInt(saved);
    setIndex(i);
    speakChunk(i);
  };

  /* ---------------- SUMMARIZER ---------------- */

  const summarize = () => {
    const words = text.split(" ").slice(0, 120).join(" ");
    alert("Summary:\n\n" + words + "...");
  };

  /* ---------------- UI ---------------- */

  return (
    <main style={{ padding: 30, fontFamily: "sans-serif", maxWidth: 900, margin: "auto" }}>

      <h1>📘 PDF → Audio Reader (Pro Stable)</h1>

      {/* Upload */}
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />

      {/* Drag */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={drop}
        style={{
          border: "2px dashed gray",
          padding: 40,
          marginTop: 15,
          textAlign: "center"
        }}
      >
        Drag & Drop PDF here
      </div>

      {/* Progress */}
      {progress > 0 && (
        <progress value={progress} max={100} style={{ width: "100%", marginTop: 10 }} />
      )}

      {/* Buttons */}
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button onClick={play}>▶ Play</button>
        <button onClick={pause}>⏸ Pause</button>
        <button onClick={resume}>🔁 Resume</button>
        <button onClick={stop}>⏹ Stop</button>
        <button onClick={bookmark}>🔖 Bookmark</button>
        <button onClick={resumeBookmark}>↩ Resume Bookmark</button>
        <button onClick={summarize}>🧠 Summarize</button>
        <button onClick={() => setDark(!dark)}>🌙 Toggle Dark</button>
      </div>

      {/* Chapter nav */}
      {chunks.length > 0 && (
        <div style={{ marginTop: 20 }}>
          Chapter:
          <input
            type="number"
            min={0}
            max={chunks.length - 1}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            style={{ marginLeft: 10, width: 70 }}
          />
        </div>
      )}

      {/* Text preview */}
      <textarea
        value={text}
        readOnly
        style={{
          width: "100%",
          height: 300,
          marginTop: 20,
          padding: 10
        }}
      />
    </main>
  );
}
