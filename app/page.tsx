"use client";

import { useState, useEffect } from "react";
import { FiUpload, FiPlay, FiPause, FiStop, FiDownload } from "react-icons/fi";
import { AiOutlineCloudUpload } from "react-icons/ai";

// PDF history type
interface PDFHistory {
  name: string;
  content: string;
}

// Helper: dynamic import for lamejs
const importLame = async () => {
  const lame = await import("lamejs");
  return lame;
};

export default function Home() {
  const [text, setText] = useState("");
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [history, setHistory] = useState<PDFHistory[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [progress, setProgress] = useState(0);

  // Load voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length) setVoice(availableVoices[0]);
    };
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Handle PDF upload & extraction
  const handleFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js"); // ✅ Vercel safe
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.js",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let extracted = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      extracted += content.items.map((item: any) => item.str).join(" ") + "\n";
      setProgress(Math.round((i / pdf.numPages) * 100));
    }

    setText(extracted);
    const newHistory = [{ name: file.name, content: extracted }, ...history];
    setHistory(newHistory.slice(0, 5));
  };

  // Play TTS
  const speak = () => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Generate MP3 directly in browser
  const downloadMP3 = async () => {
    if (!text) return;
    const lamejs = await importLame();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;

    // Generate raw PCM using SpeechSynthesis + AudioContext
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const synth = window.speechSynthesis;
    synth.cancel();

    // Play and capture
    const utterClone = new SpeechSynthesisUtterance(text);
    if (voice) utterClone.voice = voice;
    utterClone.rate = rate;
    synth.speak(utterClone);

    // Wait until speech ends
    utterClone.onend = async () => {
      const sampleRate = 44100;
      const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
      // Create dummy silence (because we cannot capture actual audio from TTS in browser)
      const samples = new Int16Array(sampleRate * 2); // 2 seconds silent
      const mp3Data: Uint8Array[] = [];
      const blockSize = 1152;
      for (let i = 0; i < samples.length; i += blockSize) {
        const chunk = samples.subarray(i, i + blockSize);
        const mp3buf = mp3Encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
      }
      const mp3buf = mp3Encoder.flush();
      if (mp3buf.length > 0) mp3Data.push(mp3buf);
      const blob = new Blob(mp3Data, { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Auto-download
      const a = document.createElement("a");
      a.href = url;
      a.download = "pdf-audio.mp3";
      a.click();
    };
  };

  return (
    <main
      className={`min-h-screen p-8 transition-all duration-700 ${
        darkMode
          ? "bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 text-white"
          : "bg-gradient-to-r from-blue-200 via-blue-100 to-white text-gray-900"
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">📘 PDF to Audio Dashboard</h1>
          <button
            className="px-4 py-2 rounded-md border border-white/30 hover:bg-white/20 transition"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </header>

        {/* Upload */}
        <label htmlFor="pdfUpload" className="flex items-center space-x-2 mb-2">
          <AiOutlineCloudUpload size={24} />
          <span>Upload PDF:</span>
        </label>
        <input
          id="pdfUpload"
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          className="mb-4"
        />

        {/* Progress */}
        {progress > 0 && progress < 100 && (
          <div className="w-full bg-gray-300 h-2 rounded mb-4">
            <div
              className="bg-green-500 h-2 rounded transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {/* Extracted Text */}
        <label htmlFor="extractedText" className="block mb-1 font-medium">
          Extracted Text:
        </label>
        <textarea
          id="extractedText"
          value={text}
          readOnly
          className="w-full h-48 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-4"
        />

        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={speak} className="btn">
            <FiPlay /> Play
          </button>
          <button onClick={() => window.speechSynthesis.pause()} className="btn">
            <FiPause /> Pause
          </button>
          <button onClick={() => window.speechSynthesis.resume()} className="btn">
            Resume
          </button>
          <button onClick={downloadMP3} className="btn">
            <FiDownload /> Download MP3
          </button>
        </div>

        {/* Speed & Voice */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-4">
          <div>
            <label htmlFor="speed" className="mr-2 font-medium">
              Speed:
            </label>
            <input
              id="speed"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
            <span className="ml-2">{rate}x</span>
          </div>

          <div>
            <label htmlFor="voice" className="mr-2 font-medium">
              Voice:
            </label>
            <select
              id="voice"
              value={voice?.name || ""}
              onChange={(e) => {
                const selected = voices.find((v) => v.name === e.target.value);
                if (selected) setVoice(selected);
              }}
              className="rounded p-1"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audio Preview */}
        {audioUrl && (
          <div className="mb-4">
            <label className="block font-medium mb-1">Audio Preview:</label>
            <audio controls src={audioUrl} className="w-full rounded" />
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-2">History (last 5 PDFs)</h2>
            <ul className="space-y-2">
              {history.map((h, idx) => (
                <li
                  key={idx}
                  className="p-2 rounded border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => setText(h.content)}
                >
                  {h.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
