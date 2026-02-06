"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function Home() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  /* ---------------- LOAD PDF.JS FROM CDN ---------------- */
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    };

    document.body.appendChild(script);
  }, []);

  /* ---------------- LOAD VOICES ---------------- */
  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  /* ---------------- PDF TEXT EXTRACTION ---------------- */
  const extractText = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(" ") + "\n\n";
    }

    setText(fullText);
  };

  /* ---------------- SPEECH ---------------- */
  const speak = () => {
    if (!text) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voices[voiceIndex];

    utter.onboundary = (e) => {
      setProgress((e.charIndex / text.length) * 100);
    };

    window.speechSynthesis.speak(utter);
  };

  const stop = () => window.speechSynthesis.cancel();

  /* ---------------- UI ---------------- */
  return (
    <main style={{ padding: 30, fontFamily: "sans-serif" }}>
      <h1>📄➡️🔊 PDF to Audio Reader (Real Text Version)</h1>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) => e.target.files && extractText(e.target.files[0])}
      />

      <br />
      <br />

      <textarea
        value={text}
        readOnly
        style={{ width: "100%", height: 250 }}
      />

      <br />

      <select onChange={(e) => setVoiceIndex(Number(e.target.value))}>
        {voices.map((v, i) => (
          <option key={i} value={i}>
            {v.name}
          </option>
        ))}
      </select>

      <br />
      <br />

      <button onClick={speak}>▶ Play</button>
      <button onClick={stop}>⏹ Stop</button>

      <div
        style={{
          height: 6,
          background: "#ddd",
          marginTop: 10,
        }}
      >
        <div
          style={{
            height: "100%",
            width: progress + "%",
            background: "green",
          }}
        />
      </div>
    </main>
  );
}
