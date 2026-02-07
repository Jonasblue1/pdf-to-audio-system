"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ================================
     LOAD PDF + EXTRACT TEXT
  ================================= */
  const handleFile = async (file: File) => {
    setLoading(true);
    setText("");

    try {
      // load pdfjs ONLY in browser
      const pdfjsLib = await import("pdfjs-dist");

      // ⭐ IMPORTANT — use SAME VERSION local worker
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "/pdf.worker.min.mjs";

      const buffer = await file.arrayBuffer();

      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");

        fullText += pageText + "\n\n";
      }

      setText(fullText);
    } catch (err) {
      console.error(err);
      alert("Failed to read PDF");
    }

    setLoading(false);
  };

  /* ================================
     SPEECH
  ================================= */
  const speak = () => {
    if (!text) return alert("Upload a PDF first");

    speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;

    utterRef.current = utter;
    speechSynthesis.speak(utter);
  };

  const pause = () => speechSynthesis.pause();
  const resume = () => speechSynthesis.resume();
  const stop = () => speechSynthesis.cancel();

  /* ================================
     UI
  ================================= */
  return (
    <main style={{ maxWidth: 700, margin: "40px auto", padding: 20 }}>
      <h2>📄 Simple PDF → Speech Reader</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />

      {loading && <p>Extracting text...</p>}

      <div style={{ marginTop: 20 }}>
        <button onClick={speak}>▶ Play</button>
        <button onClick={pause}>⏸ Pause</button>
        <button onClick={resume}>▶ Resume</button>
        <button onClick={stop}>⏹ Stop</button>
      </div>

      <textarea
        value={text}
        readOnly
        style={{ width: "100%", height: 300, marginTop: 20 }}
      />
    </main>
  );
}
