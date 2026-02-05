"use client";

import { useEffect, useRef, useState } from "react";

type HistoryItem = { name: string; text: string };

export default function Home() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);

  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);

  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dark, setDark] = useState(true);

  const [progress, setProgress] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const wordsRef = useRef<string[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ===========================
     LOAD VOICES
  =========================== */
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  /* ===========================
     HISTORY
  =========================== */
  useEffect(() => {
    const saved = localStorage.getItem("pdfHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (item: HistoryItem) => {
    const updated = [item, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("pdfHistory", JSON.stringify(updated));
  };

  /* ===========================
     DRAG & DROP
  =========================== */
  const dropHandler = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* ===========================
     PDF EXTRACTION
  =========================== */
  const handleFile = async (file: File) => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((it: any) => it.str).join(" ") + "\n\n";
    }

    setText(fullText);
    wordsRef.current = fullText.split(" ");
    saveHistory({ name: file.name, text: fullText });
  };

  /* ===========================
     SMART LANGUAGE AUTO-DETECT
  =========================== */
  const detectLanguage = (t: string) => {
    if (/[\u0600-\u06FF]/.test(t)) return "ar";
    if (/[\u4E00-\u9FFF]/.test(t)) return "zh";
    if (/[\u0900-\u097F]/.test(t)) return "hi";
    return "en";
  };

  /* ===========================
     CHUNK SPEECH ENGINE
  =========================== */
  const speakChunks = () => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const words = wordsRef.current;
    const chunkSize = 120;

    let index = 0;

    const speakNext = () => {
      if (index >= words.length) return;

      const chunk = words.slice(index, index + chunkSize).join(" ");

      const u = new SpeechSynthesisUtterance(chunk);

      u.voice = voices[voiceIndex];
      u.rate = rate;
      u.volume = volume;
      u.lang = detectLanguage(chunk);

      utteranceRef.current = u;

      u.onboundary = () => {
        setHighlightIndex(index);
        setProgress(Math.floor((index / words.length) * 100));
      };

      u.onend = () => {
        index += chunkSize;
        speakNext();
      };

      window.speechSynthesis.speak(u);
    };

    speakNext();
  };

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => window.speechSynthesis.cancel();

  /* ===========================
     RECORD AUDIO
  =========================== */
  const downloadAudio = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioURL(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = "pdf-audio.webm";
      a.click();
    };

    recorder.start();
    speakChunks();

    setTimeout(() => recorder.stop(), 5000);
  };

  /* ===========================
     UI THEME
  =========================== */
  const theme = dark
    ? "bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-white"
    : "bg-gradient-to-br from-gray-100 to-gray-300 text-black";

  const words = wordsRef.current;

  /* ===========================
     UI
  =========================== */
  return (
    <main
      className={`${theme} min-h-screen p-6 transition-all`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={dropHandler}
    >
      <div className="max-w-5xl mx-auto space-y-6">

        <h1 className="text-4xl font-bold text-center">
          🚀 Ultimate PDF → Audio System
        </h1>

        {/* DARK MODE */}
        <button
          onClick={() => setDark(!dark)}
          className="px-4 py-2 rounded bg-black/30"
        >
          Toggle Dark/Light
        </button>

        {/* UPLOAD */}
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />

        {/* PROGRESS */}
        <div className="w-full bg-black/20 h-3 rounded">
          <div
            style={{ width: progress + "%" }}
            className="bg-green-500 h-3 rounded"
          />
        </div>

        {/* WORD HIGHLIGHT */}
        {words.length > 0 && (
          <div className="p-3 bg-white/20 rounded max-h-40 overflow-auto">
            {words.map((w, i) => (
              <span
                key={i}
                className={
                  i >= highlightIndex && i < highlightIndex + 20
                    ? "bg-yellow-300 text-black"
                    : ""
                }
              >
                {w}{" "}
              </span>
            ))}
          </div>
        )}

        {/* CONTROLS */}
        <div className="grid grid-cols-5 gap-2">
          <button onClick={speakChunks}>Play</button>
          <button onClick={pause}>Pause</button>
          <button onClick={resume}>Resume</button>
          <button onClick={stop}>Stop</button>
          <button onClick={downloadAudio}>Download</button>
        </div>

        {/* SETTINGS */}
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

        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />

        {audioURL && <audio controls src={audioURL} />}

        {/* HISTORY */}
        {history.map((h, i) => (
          <button key={i} onClick={() => setText(h.text)}>
            {h.name}
          </button>
        ))}
      </div>
    </main>
  );
}
