"use client";

import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";

export default function Home() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [dark, setDark] = useState(true);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  /* =====================
     LOAD VOICES
  ===================== */
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  /* =====================
     PDF READ (100% safe)
  ===================== */
  const readPDF = async (file: File) => {
    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let full = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      full += content.items.map((x: any) => x.str).join(" ") + "\n\n";
    }

    setText(full);
    setHistory((h) => [file.name, ...h.slice(0, 4)]);
  };

  /* =====================
     SPEECH ENGINE (FIXED)
  ===================== */
  const speak = () => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);

    u.voice = voices[voiceIndex];
    u.rate = rate;

    u.onboundary = (e) => {
      const percent = (e.charIndex / text.length) * 100;
      setProgress(percent);
    };

    window.speechSynthesis.speak(u);
  };

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => window.speechSynthesis.cancel();

  /* =====================
     TEXT DOWNLOAD (REAL)
  ===================== */
  const downloadText = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf-text.txt";
    a.click();
  };

  /* =====================
     DRAG DROP
  ===================== */
  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    readPDF(e.dataTransfer.files[0]);
  };

  const theme = dark
    ? "bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-white"
    : "bg-gradient-to-br from-gray-100 to-gray-300 text-black";

  /* =====================
     UI
  ===================== */
  return (
    <main
      onDragOver={(e) => e.preventDefault()}
      onDrop={drop}
      className={`${theme} min-h-screen p-6 transition-all`}
    >
      <div className="max-w-4xl mx-auto space-y-6">

        <h1 className="text-3xl font-bold text-center">
          🎧 PDF → Audio Reader (Stable Version)
        </h1>

        <button
          onClick={() => setDark(!dark)}
          className="px-4 py-2 bg-black/30 rounded"
        >
          Toggle Dark/Light
        </button>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => e.target.files && readPDF(e.target.files[0])}
        />

        <div className="w-full bg-black/20 h-3 rounded">
          <div
            style={{ width: progress + "%" }}
            className="bg-green-400 h-3 rounded"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button onClick={speak}>Play</button>
          <button onClick={pause}>Pause</button>
          <button onClick={resume}>Resume</button>
          <button onClick={stop}>Stop</button>
        </div>

        <select
          value={voiceIndex}
          onChange={(e) => setVoiceIndex(Number(e.target.value))}
        >
          {voices.map((v, i) => (
            <option key={i} value={i}>
              {v.name}
            </option>
          ))}
        </select>

        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
        />

        <button onClick={downloadText}>Download Extracted Text</button>

        {history.map((h, i) => (
          <p key={i}>{h}</p>
        ))}
      </div>
    </main>
  );
}
