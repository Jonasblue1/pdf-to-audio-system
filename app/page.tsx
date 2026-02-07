"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 MUST be ref (not variable)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ================= PDF → TEXT ================= */
  const handleFile = async (file: File) => {
    setLoading(true);

    const pdfjs: any = await import("pdfjs-dist");

    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    let result = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      result += content.items.map((i: any) => i.str).join(" ") + "\n\n";
    }

    setText(result);
    setLoading(false);
  };

  /* ================= SPEECH ================= */
  const play = () => {
    if (!text) {
      alert("Upload a PDF first");
      return;
    }

    // cancel any existing
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;

    utteranceRef.current = utter;

    window.speechSynthesis.speak(utter);
  };

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => window.speechSynthesis.cancel();

  /* ================= UI ================= */
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h2>PDF → Speech Reader (Simple + Working)</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) =>
          e.target.files && handleFile(e.target.files[0])
        }
      />

      {loading && <p>Reading PDF...</p>}

      <div style={{ marginTop: 20 }}>
        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>
        <button onClick={resume}>Resume</button>
        <button onClick={stop}>Stop</button>
      </div>

      <textarea
        value={text}
        readOnly
        style={{
          width: "100%",
          height: 300,
          marginTop: 20,
        }}
      />
    </main>
  );
}
