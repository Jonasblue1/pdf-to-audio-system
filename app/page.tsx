"use client";

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [rate, setRate] = useState(1);

  const handleFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ dynamic import (browser only)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");

    // ✅ LOCAL bundled worker (BEST METHOD)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let extracted = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      extracted +=
        content.items.map((item: any) => item.str).join(" ") + "\n";
    }

    setText(extracted);
  };

  const speak = () => {
    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <main style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
      <h1>📘 PDF to Audio System</h1>
      <p>Built by Okwuiwe Alphonsus Jonas</p>

      {/* Upload */}
      <label htmlFor="pdfUpload">Upload PDF:</label>
      <br />
      <input
        id="pdfUpload"
        name="pdfUpload"
        type="file"
        accept="application/pdf"
        onChange={handleFile}
      />

      <br /><br />

      {/* Text Output */}
      <label htmlFor="extractedText">Extracted Text:</label>
      <br />
      <textarea
        id="extractedText"
        name="extractedText"
        value={text}
        readOnly
        style={{ width: "100%", height: 250 }}
      />

      <br /><br />

      {/* Controls */}
      <button onClick={speak}>Play</button>
      <button onClick={() => window.speechSynthesis.pause()}>Pause</button>
      <button onClick={() => window.speechSynthesis.resume()}>Resume</button>
      <button onClick={() => window.speechSynthesis.cancel()}>Stop</button>

      <br /><br />

      {/* Speed */}
      <label htmlFor="speedControl">Speed: </label>
      <input
        id="speedControl"
        name="speedControl"
        type="range"
        min="0.5"
        max="2"
        step="0.1"
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
      />
    </main>
  );
}
