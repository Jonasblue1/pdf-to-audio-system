"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function Home() {
  /* ================= STATES ================= */
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dark, setDark] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [audioURL, setAudioURL] = useState("");

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  /* ================= LOAD PDF.JS CDN ================= */
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

  /* ================= LOAD VOICES ================= */
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  /* ================= HISTORY ================= */
  useEffect(() => {
    const h = JSON.parse(localStorage.getItem("history") || "[]");
    setHistory(h);
  }, []);

  const saveHistory = (name: string) => {
    const newH = [name, ...history].slice(0, 5);
    setHistory(newH);
    localStorage.setItem("history", JSON.stringify(newH));
  };

  /* ================= PDF EXTRACTION ================= */
  const extractText = async (file: File) => {
    const buffer = await file.arrayBuffer();

    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;

    let full = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const strings = content.items.map((it: any) => it.str);
      full += strings.join(" ") + "\n\n";
    }

    setText(full);
    saveHistory(file.name);
  };

  /* ================= SPEECH + RECORD ================= */
  const speak = () => {
    if (!text) return;

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voices[voiceIndex];

    /* progress */
    utter.onboundary = (e) => {
      setProgress((e.charIndex / text.length) * 100);
    };

    /* record audio */
    const stream = new AudioContext().createMediaStreamDestination();

    const recorder = new MediaRecorder(stream.stream);
    mediaRecorder.current = recorder;

    recorder.ondataavailable = (e) => audioChunks.current.push(e.data);

    recorder.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      setAudioURL(URL.createObjectURL(blob));
      audioChunks.current = [];
    };

    recorder.start();

    speechSynthesis.speak(utter);
  };

  const stop = () => {
    speechSynthesis.cancel();
    mediaRecorder.current?.stop();
  };

  /* ================= DRAG DROP ================= */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) extractText(e.dataTransfer.files[0]);
  };

  /* ================= UI ================= */
  return (
    <main
      className={`min-h-screen p-8 transition-all ${
        dark
          ? "bg-gradient-to-br from-gray-900 to-black text-white"
          : "bg-gradient-to-br from-gray-100 to-white text-black"
      }`}
    >
      <h1 className="text-3xl font-bold mb-6">
        🚀 Pro PDF → Audio Reader
      </h1>

      {/* Dark toggle */}
      <button
        onClick={() => setDark(!dark)}
        className="px-4 py-2 rounded bg-blue-600 text-white mb-4"
      >
        Toggle Dark/Light
      </button>

      {/* Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed p-10 text-center rounded-lg mb-4"
      >
        Drag & Drop PDF here
        <br />
        <input
          type="file"
          accept=".pdf"
          onChange={(e) =>
            e.target.files && extractText(e.target.files[0])
          }
          className="mt-2"
        />
      </div>

      {/* History */}
      <div className="mb-4 text-sm">
        Last PDFs: {history.join(" | ")}
      </div>

      {/* Text */}
      <textarea
        value={text}
        readOnly
        className="w-full h-48 p-2 rounded text-black"
      />

      {/* Controls */}
      <div className="flex gap-2 mt-4 flex-wrap">
        <select
          onChange={(e) => setVoiceIndex(Number(e.target.value))}
          className="text-black p-2"
        >
          {voices.map((v, i) => (
            <option key={i} value={i}>
              {v.name}
            </option>
          ))}
        </select>

        <button onClick={speak} className="bg-green-600 px-4 py-2 rounded">
          ▶ Play
        </button>

        <button onClick={stop} className="bg-red-600 px-4 py-2 rounded">
          ⏹ Stop
        </button>
      </div>

      {/* Progress */}
      <div className="h-2 bg-gray-300 mt-4 rounded">
        <div
          style={{ width: progress + "%" }}
          className="h-full bg-green-500 rounded"
        />
      </div>

      {/* Download */}
      {audioURL && (
        <a
          href={audioURL}
          download="speech.webm"
          className="block mt-4 underline"
        >
          Save Audio
        </a>
      )}
    </main>
  );
}
