"use client";

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  let utterance: SpeechSynthesisUtterance | null = null;

  /* ================= LOAD PDF + EXTRACT TEXT ================= */
  const handleFile = async (file: File) => {
    if (!file) return;

    setLoading(true);

    // SAFE dynamic import (browser only)
    const pdfjs: any = await import("pdfjs-dist");

    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
    setLoading(false);
  };

  /* ================= SPEECH ================= */
  const play = () => {
    if (!text) return alert("Upload a PDF first");

    speechSynthesis.cancel();

    utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;

    utterance.onend = () => setSpeaking(false);

    speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const pause = () => speechSynthesis.pause();
  const resume = () => speechSynthesis.resume();
  const stop = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  /* ================= UI ================= */
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 40,
        background: "#111",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <h1>📄 Simple PDF → Speech Reader</h1>

      {/* Upload */}
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) =>
          e.target.files && handleFile(e.target.files[0])
        }
      />

      {loading && <p>Extracting text...</p>}

      {/* Controls */}
      <div style={{ marginTop: 20 }}>
        <button onClick={play}>▶ Play</button>
        <button onClick={pause}>⏸ Pause</button>
        <button onClick={resume}>▶ Resume</button>
        <button onClick={stop}>⏹ Stop</button>
      </div>

      {/* Text preview */}
      <textarea
        value={text}
        readOnly
        style={{
          width: "100%",
          height: 300,
          marginTop: 20,
          background: "#222",
          color: "white",
          padding: 10,
        }}
      />
    </main>
  );
}
