"use client";

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);

  /* ---------------- SAFE PDF LOADER ---------------- */
  const loadPdfJs = async () => {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    return pdfjs;
  };

  /* ---------------- EXTRACT TEXT ---------------- */
  const handleFile = async (file: File) => {
    const pdfjs = await loadPdfJs();

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    let output = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");

      output += pageText + "\n\n";
    }

    setText(output);
  };

  /* ---------------- SPEECH ---------------- */
  const speak = () => {
    if (!text) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;

    speechSynthesis.speak(utter);
    setSpeaking(true);

    utter.onend = () => setSpeaking(false);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setSpeaking(false);
  };

  /* ---------------- UI ---------------- */
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>PDF → Audio Reader</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={speak} disabled={speaking}>
        ▶ Play
      </button>

      <button onClick={stop}>
        ⏹ Stop
      </button>

      <pre style={{ whiteSpace: "pre-wrap", marginTop: 30 }}>
        {text}
      </pre>
    </main>
  );
}
