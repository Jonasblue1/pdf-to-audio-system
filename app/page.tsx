"use client";

import { useEffect, useRef, useState } from "react";

type HistoryItem = {
  name: string;
  text: string;
};

export default function Home() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [audioURL, setAudioURL] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ---------------- LOAD VOICES ---------------- */
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  /* ---------------- HISTORY ---------------- */
  useEffect(() => {
    const saved = localStorage.getItem("pdfHistory");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (item: HistoryItem) => {
    const updated = [item, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("pdfHistory", JSON.stringify(updated));
  };

  /* ---------------- PDF EXTRACTION ---------------- */
  const handleFile = async (file: File) => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      fullText +=
        content.items
          .map((item: any) => item.str)
          .join(" ") + "\n\n";
    }

    setText(fullText);

    saveHistory({
      name: file.name,
      text: fullText,
    });
  };

  /* ---------------- PLAY CONTROLS ---------------- */
  const speak = () => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);

    u.voice = voices[voiceIndex];
    u.rate = rate;
    u.volume = volume;

    utteranceRef.current = u;

    window.speechSynthesis.speak(u);
  };

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => window.speechSynthesis.cancel();

  /* ---------------- RECORD → WAV DOWNLOAD ---------------- */
  const downloadAudio = async () => {
    if (!text) return;

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
      a.download = "pdf-audio.webm"; // plays everywhere
      a.click();
    };

    recorder.start();

    const u = new SpeechSynthesisUtterance(text);
    u.voice = voices[voiceIndex];
    u.rate = rate;
    u.volume = volume;

    u.onend = () => recorder.stop();

    window.speechSynthesis.speak(u);
  };

  const readingTime = Math.ceil(text.split(" ").length / 180);

  /* ---------------- UI ---------------- */
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <h1 className="text-4xl font-bold text-center">
          🚀 Ultimate PDF → Audio System
        </h1>

        {/* Upload */}
        <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </div>

        {/* Text preview */}
        {text && (
          <textarea
            value={text}
            readOnly
            className="w-full h-40 p-4 text-black rounded-lg"
          />
        )}

        {/* Controls */}
        <div className="grid md:grid-cols-5 gap-3">

          <button onClick={speak} className="bg-green-600 p-3 rounded">Play</button>
          <button onClick={pause} className="bg-yellow-500 p-3 rounded">Pause</button>
          <button onClick={resume} className="bg-blue-500 p-3 rounded">Resume</button>
          <button onClick={stop} className="bg-red-600 p-3 rounded">Stop</button>
          <button onClick={downloadAudio} className="bg-indigo-600 p-3 rounded">
            Download Audio
          </button>
        </div>

        {/* Settings */}
        <div className="grid md:grid-cols-3 gap-4">

          <select
            value={voiceIndex}
            onChange={(e) => setVoiceIndex(Number(e.target.value))}
            className="text-black p-2 rounded"
          >
            {voices.map((v, i) => (
              <option key={i} value={i}>{v.name}</option>
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
        </div>

        {/* Reading time */}
        {text && (
          <p className="text-center">
            ⏱ Estimated reading time: {readingTime} minutes
          </p>
        )}

        {/* Audio preview */}
        {audioURL && (
          <audio controls src={audioURL} className="w-full" />
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white/10 p-4 rounded-xl space-y-2">
            <h2 className="font-bold">History</h2>

            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setText(h.text)}
                className="block w-full text-left hover:underline"
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
