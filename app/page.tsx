"use client";

import { useEffect, useRef, useState } from "react";

/* ======================================================
   FULL CLIENT-SIDE PDF → AUDIO PRO SYSTEM (VERCEL SAFE)
   ====================================================== */

export default function Home() {
  const [text, setText] = useState("");
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);

  const [speaking, setSpeaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dark, setDark] = useState(true);

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ================= PDF LOADER (SAFE) ================= */
  const loadPdfJs = async () => {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    return pdfjs;
  };

  /* ================= EXTRACT TEXT ================= */
  const extractText = async (file: File) => {
    const pdfjs = await loadPdfJs();

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    let result = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");

      result += pageText + "\n\n";
    }

    setText(result);

    /* split into chunks (safe for long PDFs) */
    const parts = result.match(/.{1,1000}/g) || [];
    setChunks(parts);
    setCurrentChunk(0);

    saveHistory(file.name);
  };

  /* ================= HISTORY ================= */
  const saveHistory = (name: string) => {
    const prev = JSON.parse(localStorage.getItem("history") || "[]");
    const updated = [name, ...prev.filter((n: string) => n !== name)].slice(0, 5);
    localStorage.setItem("history", JSON.stringify(updated));
  };

  /* ================= SPEECH ================= */
  const speakChunk = (index: number) => {
    if (!chunks[index]) return;

    speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(chunks[index]);
    utter.rate = 1;

    utter.onend = () => {
      const next = index + 1;
      if (next < chunks.length) {
        setCurrentChunk(next);
        speakChunk(next);
      } else {
        setSpeaking(false);
        setProgress(100);
      }
    };

    utter.onboundary = (e) => {
      setProgress(
        ((index + e.charIndex / chunks[index].length) / chunks.length) * 100
      );
    };

    utterRef.current = utter;
    speechSynthesis.speak(utter);
  };

  const play = () => {
    if (!chunks.length) return;
    setSpeaking(true);
    speakChunk(currentChunk);
  };

  const pause = () => speechSynthesis.pause();
  const resume = () => speechSynthesis.resume();

  const stop = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  /* ================= MP3 DOWNLOAD ================= */
  const downloadText = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pdf-text.txt";
    a.click();
  };

  /* ================= ELEVENLABS (optional) ================= */
  const elevenLabs = async () => {
    const key = prompt("Enter ElevenLabs API key");
    if (!key) return;

    const res = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
        }),
      }
    );

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
  };

  /* ================= DRAG DROP ================= */
  const handleDrop = (e: any) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) extractText(e.dataTransfer.files[0]);
  };

  /* ================= THEME ================= */
  const bg = dark
    ? "linear-gradient(135deg,#0f172a,#1e293b)"
    : "linear-gradient(135deg,#f8fafc,#e2e8f0)";

  /* ================= UI ================= */
  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{
        minHeight: "100vh",
        padding: 40,
        color: dark ? "white" : "black",
        background: bg,
        fontFamily: "sans-serif",
      }}
    >
      <h1>🚀 PDF → Audio Pro Reader</h1>

      {/* Upload */}
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) =>
          e.target.files && extractText(e.target.files[0])
        }
      />

      {/* Controls */}
      <div style={{ marginTop: 20 }}>
        <button onClick={play}>▶ Play</button>
        <button onClick={pause}>⏸ Pause</button>
        <button onClick={resume}>▶ Resume</button>
        <button onClick={stop}>⏹ Stop</button>
        <button onClick={downloadText}>💾 Save Text</button>
        <button onClick={elevenLabs}>🎙 ElevenLabs</button>
        <button onClick={() => setDark(!dark)}>🌗 Theme</button>
      </div>

      {/* Progress */}
      <div
        style={{
          height: 10,
          background: "#333",
          marginTop: 20,
          borderRadius: 5,
        }}
      >
        <div
          style={{
            width: progress + "%",
            height: "100%",
            background: "#22c55e",
          }}
        />
      </div>

      {/* Text */}
      <pre
        style={{
          marginTop: 30,
          whiteSpace: "pre-wrap",
          maxHeight: 400,
          overflow: "auto",
        }}
      >
        {text}
      </pre>
    </div>
  );
}
