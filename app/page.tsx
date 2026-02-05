"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [pdfjs, setPdfjs] = useState<any>(null);

  const [text, setText] = useState("");
  const [progress, setProgress] = useState(0);
  const [dark, setDark] = useState(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  const [highlightIndex, setHighlightIndex] = useState(-1);

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* =========================
     LOAD PDFJS SAFE (NO WORKER IMPORT)
  ========================= */
  useEffect(() => {
    const load = async () => {
      const pdf = await import("pdfjs-dist");

      // ✅ CDN worker fixes ALL build errors
      pdf.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdf.version}/pdf.worker.min.js`;

      setPdfjs(pdf);
    };

    load();
  }, []);

  /* =========================
     VOICES
  ========================= */
  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  /* =========================
     PDF TEXT EXTRACTION
  ========================= */
  const extractText = async (file: File) => {
    if (!pdfjs) return;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    let combined = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      combined += content.items.map((item: any) => item.str).join(" ") + " ";
      setProgress(Math.floor((i / pdf.numPages) * 100));
    }

    setText(combined);
  };

  /* =========================
     DRAG DROP
  ========================= */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) extractText(file);
  };

  /* =========================
     CHUNKING
  ========================= */
  const chunkText = (t: string, size = 600) => {
    const parts = [];
    for (let i = 0; i < t.length; i += size) {
      parts.push(t.slice(i, i + size));
    }
    return parts;
  };

  /* =========================
     SPEECH
  ========================= */
  const speak = () => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const chunks = chunkText(text);
    let index = 0;

    const speakChunk = () => {
      if (index >= chunks.length) return;

      const utter = new SpeechSynthesisUtterance(chunks[index]);
      utterRef.current = utter;

      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) utter.voice = voice;

      utter.rate = rate;
      utter.pitch = pitch;

      utter.onboundary = (e: any) => {
        setHighlightIndex(e.charIndex + index * 600);
      };

      utter.onend = () => {
        index++;
        speakChunk();
      };

      window.speechSynthesis.speak(utter);
    };

    speakChunk();
  };

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => window.speechSynthesis.cancel();

  /* =========================
     UI
  ========================= */
  const words = text.split(" ");

  return (
    <main className={`min-h-screen p-10 ${dark ? "bg-black text-white" : "bg-gray-100 text-black"}`}>
      <h1 className="text-3xl font-bold mb-6">🎧 Ultimate PDF → Audio</h1>

      <button
        onClick={() => setDark(!dark)}
        className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        Toggle {dark ? "Light" : "Dark"}
      </button>

      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-4 border-dashed p-10 mb-4 text-center rounded"
      >
        Drag & Drop PDF Here
      </div>

      {progress > 0 && (
        <div className="w-full bg-gray-300 h-3 mb-4 rounded">
          <div className="bg-green-500 h-3" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={speak} className="btn">Play</button>
        <button onClick={pause} className="btn">Pause</button>
        <button onClick={resume} className="btn">Resume</button>
        <button onClick={stop} className="btn">Stop</button>

        <select onChange={e => setSelectedVoice(e.target.value)} className="btn">
          {voices.map(v => (
            <option key={v.name}>{v.name}</option>
          ))}
        </select>
      </div>

      <div className="text-lg leading-8">
        {words.map((w, i) => (
          <span key={i} className={i === highlightIndex ? "bg-yellow-400 text-black" : ""}>
            {w}{" "}
          </span>
        ))}
      </div>

      <style jsx>{`
        .btn {
          background: #2563eb;
          color: white;
          padding: 8px 14px;
          border-radius: 8px;
        }
      `}</style>
    </main>
  );
}
