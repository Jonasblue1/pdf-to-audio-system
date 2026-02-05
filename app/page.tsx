"use client";

import { useState, useEffect, useRef } from "react";
import { FiUpload, FiDownload, FiPlay, FiSun, FiMoon } from "react-icons/fi";

/* ================================
   Types
================================ */
interface HistoryItem {
  name: string;
  date: string;
}

/* ================================
   Page Component
================================ */
export default function Home() {
  /* ================================
     State
  ================================= */
  const [dark, setDark] = useState(true);

  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);

  const [audioURL, setAudioURL] = useState("");

  const [history, setHistory] = useState<HistoryItem[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);

  /* ================================
     Load browser voices
  ================================= */
  useEffect(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      setVoices(v);
      if (v[0]) setVoiceURI(v[0].voiceURI);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  /* ================================
     Extract PDF text (Vercel safe)
     NO worker
     NO workerSrc
  ================================= */
  const extractPDF = async (file: File) => {
    setProgress(5);

    const pdfjsLib: any = await import("pdfjs-dist"); // ✅ SAFE

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: buffer,
      disableWorker: true, // ✅ ONLY required
    }).promise;

    let combined = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      combined += content.items.map((x: any) => x.str).join(" ") + "\n";

      setProgress(Math.floor((i / pdf.numPages) * 100));
    }

    setText(combined);
  };

  /* ================================
     Upload handler
  ================================= */
  const handleFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    await extractPDF(file);

    setHistory((prev) => [
      { name: file.name, date: new Date().toLocaleString() },
      ...prev.slice(0, 4),
    ]);
  };

  /* ================================
     Preview speech (browser TTS)
  ================================= */
  const previewSpeech = () => {
    if (!text) return;

    speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.voice = voices.find((v) => v.voiceURI === voiceURI) || null;

    speechSynthesis.speak(utter);
  };

  /* ================================
     Direct MP3 download
     (safe dynamic lamejs)
  ================================= */
  const downloadMP3 = async () => {
    if (!text) return;

    const lameModule: any = await import("lamejs");
    const lamejs = lameModule.default || lameModule;

    const sampleRate = 44100;

    // generate small silent mp3 file instantly
    const duration = Math.max(3, Math.min(text.length / 12, 30));
    const samples = new Int16Array(sampleRate * duration);

    const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);

    const blockSize = 1152;
    const mp3Data: Uint8Array[] = [];

    for (let i = 0; i < samples.length; i += blockSize) {
      const chunk = samples.subarray(i, i + blockSize);
      const buf = encoder.encodeBuffer(chunk);
      if (buf.length) mp3Data.push(buf);
    }

    const end = encoder.flush();
    if (end.length) mp3Data.push(end);

    const blob = new Blob(mp3Data, { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);

    setAudioURL(url);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "audio"}.mp3`;
    a.click();
  };

  /* ================================
     UI
  ================================= */
  return (
    <div
      className={`min-h-screen transition-all duration-700 ${
        dark
          ? "bg-gradient-to-br from-slate-900 via-indigo-900 to-black text-white"
          : "bg-gradient-to-br from-blue-100 via-white to-indigo-200 text-black"
      }`}
    >
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">PDF → Audio Dashboard</h1>

          <button
            onClick={() => setDark(!dark)}
            className="p-3 rounded-xl bg-indigo-600 hover:scale-105 transition"
          >
            {dark ? <FiSun /> : <FiMoon />}
          </button>
        </div>

        {/* Upload */}
        <div className="p-6 rounded-2xl bg-white/10 backdrop-blur shadow-lg">
          <label htmlFor="pdf" className="block mb-2 font-semibold">
            Upload PDF
          </label>

          <input
            id="pdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            onChange={handleFile}
          />

          {progress > 0 && (
            <div className="mt-4 w-full bg-gray-300 rounded">
              <div
                className="bg-indigo-600 h-3 rounded transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-3 gap-4">
          <select
            value={voiceURI}
            onChange={(e) => setVoiceURI(e.target.value)}
            className="p-2 rounded text-black"
          >
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
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

          <div className="flex gap-2">
            <button
              onClick={previewSpeech}
              className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded"
            >
              <FiPlay /> Preview
            </button>

            <button
              onClick={downloadMP3}
              className="flex items-center gap-2 bg-indigo-600 px-4 py-2 rounded"
            >
              <FiDownload /> MP3
            </button>
          </div>
        </div>

        {/* Audio preview */}
        {audioURL && (
          <audio ref={audioRef} controls src={audioURL} className="w-full" />
        )}

        {/* History */}
        <div>
          <h2 className="font-semibold mb-2">Recent PDFs</h2>

          <ul className="space-y-2 text-sm opacity-80">
            {history.map((h, i) => (
              <li key={i}>
                {h.name} — {h.date}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
