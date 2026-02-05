"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [pdfjs, setPdfjs] = useState<any>(null);
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [progress, setProgress] = useState(0);
  const [dark, setDark] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  /* =========================
     LOAD PDFJS
  ========================== */
  useEffect(() => {
    const load = async () => {
      const pdf = await import("pdfjs-dist");
      pdf.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdf.version}/pdf.worker.min.js`;
      setPdfjs(pdf);
    };
    load();
  }, []);

  /* =========================
     LOAD VOICES (CRITICAL FIX)
  ========================== */
  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      if (v.length && !selectedVoice) setSelectedVoice(v[0].name);
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  /* =========================
     EXTRACT PDF
  ========================== */
  const extractText = async (file: File) => {
    if (!pdfjs) return;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    let combined = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      combined += content.items.map((x: any) => x.str).join(" ") + " ";
      setProgress(Math.floor((i / pdf.numPages) * 100));
    }

    setText(combined);
  };

  /* =========================
     CHUNK TEXT
  ========================== */
  const chunk = (t: string, size = 500) =>
    t.match(new RegExp(`.{1,${size}}`, "g")) || [];

  /* =========================
     PLAY (FIXED)
  ========================== */
  const play = async () => {
    if (!text) {
      alert("Upload a PDF first");
      return;
    }

    window.speechSynthesis.cancel(); // critical fix

    const parts = chunk(text);
    const voice = voices.find((v) => v.name === selectedVoice);

    setSpeaking(true);

    for (const part of parts) {
      await new Promise<void>((resolve) => {
        const utter = new SpeechSynthesisUtterance(part);
        if (voice) utter.voice = voice;

        utter.onend = () => resolve();

        window.speechSynthesis.speak(utter);
      });
    }

    setSpeaking(false);
  };

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  /* =========================
     SAVE MP3 (browser capture)
  ========================== */
  const saveMP3 = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "speech.txt";
    a.click();
  };

  /* =========================
     UI
  ========================== */
  return (
    <main
      className={`min-h-screen p-8 transition ${
        dark
          ? "bg-gradient-to-br from-black to-gray-900 text-white"
          : "bg-gradient-to-br from-blue-50 to-white text-black"
      }`}
    >
      <h1 className="text-3xl font-bold mb-6">🎧 PDF → Audio Reader</h1>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button className="btn" onClick={() => setDark(!dark)}>Theme</button>
        <button className="btn" onClick={() => inputRef.current?.click()}>
          Choose PDF
        </button>
        <button className="btn" onClick={play}>Play</button>
        <button className="btn" onClick={pause}>Pause</button>
        <button className="btn" onClick={resume}>Resume</button>
        <button className="btn" onClick={stop}>Stop</button>
        <button className="btn" onClick={saveMP3}>Save Text</button>
      </div>

      {/* Voice select */}
      <select
        className="btn mb-4"
        onChange={(e) => setSelectedVoice(e.target.value)}
      >
        {voices.map((v) => (
          <option key={v.name}>{v.name}</option>
        ))}
      </select>

      {/* Hidden input */}
      <input
        hidden
        type="file"
        ref={inputRef}
        accept="application/pdf"
        onChange={(e) => extractText(e.target.files![0])}
      />

      {/* Drop area */}
      <div
        onDrop={(e) => {
          e.preventDefault();
          extractText(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed p-8 rounded mb-6 text-center"
      >
        Drag & Drop PDF Here
      </div>

      {/* Progress */}
      {progress > 0 && (
        <div className="bg-gray-300 h-3 mb-6 rounded">
          <div
            className="bg-green-500 h-3"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Text preview */}
      <p className="whitespace-pre-wrap">{text.slice(0, 2000)}</p>

      <style jsx>{`
        .btn {
          background: #2563eb;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
        }
      `}</style>
    </main>
  );
}
