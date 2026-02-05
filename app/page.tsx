"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pdfjs, setPdfjs] = useState<any>(null);
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [progress, setProgress] = useState(0);
  const [dark, setDark] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [bookmark, setBookmark] = useState(0);

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* =============================
     LOAD PDFJS (SAFE CDN WORKER)
  ============================== */
  useEffect(() => {
    const load = async () => {
      const pdf = await import("pdfjs-dist");
      pdf.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdf.version}/pdf.worker.min.js`;
      setPdfjs(pdf);
    };
    load();
  }, []);

  /* =============================
     LOAD VOICES
  ============================== */
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  /* =============================
     FILE PICKER
  ============================== */
  const openFilePicker = () => fileInputRef.current?.click();

  /* =============================
     EXTRACT PDF
  ============================== */
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
    localStorage.setItem("lastText", combined);
  };

  /* =============================
     DRAG & DROP
  ============================== */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    extractText(e.dataTransfer.files[0]);
  };

  /* =============================
     CHUNKING
  ============================== */
  const chunk = (t: string, size = 600) =>
    t.match(new RegExp(`.{1,${size}}`, "g")) || [];

  /* =============================
     SPEECH
  ============================== */
  const speak = (startIndex = 0) => {
    if (!text) return;

    const parts = chunk(text);

    let index = startIndex;

    const speakChunk = () => {
      if (index >= parts.length) return;

      const utter = new SpeechSynthesisUtterance(parts[index]);
      utterRef.current = utter;

      const v = voices.find((x) => x.name === voice);
      if (v) utter.voice = v;

      utter.onend = () => {
        index++;
        setBookmark(index);
        localStorage.setItem("bookmark", String(index));
        speakChunk();
      };

      window.speechSynthesis.speak(utter);
    };

    speakChunk();
  };

  const pause = () => window.speechSynthesis.pause();
  const resume = () => window.speechSynthesis.resume();
  const stop = () => window.speechSynthesis.cancel();

  /* =============================
     MP3 RECORDING (browser native)
  ============================== */
  const saveMP3 = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "speech.mp3";
      a.click();
    };

    recorder.start();
    speak();

    setTimeout(() => recorder.stop(), 10000);
  };

  /* =============================
     AI SUMMARY (simple local)
  ============================== */
  const summarize = () => {
    const short = text.slice(0, 1200);
    setSummary(short + "...");
  };

  /* =============================
     LANGUAGE DETECT
  ============================== */
  const detectLanguage = () => {
    if (/[\u4E00-\u9FFF]/.test(text)) return "Chinese";
    if (/[\u0600-\u06FF]/.test(text)) return "Arabic";
    return "English";
  };

  /* =============================
     UI
  ============================== */
  return (
    <main
      className={`min-h-screen p-8 transition ${
        dark
          ? "bg-gradient-to-br from-black to-gray-900 text-white"
          : "bg-gradient-to-br from-blue-50 to-white text-black"
      }`}
    >
      <h1 className="text-3xl font-bold mb-6">🎧 Ultimate PDF Audio Reader</h1>

      <div className="flex gap-3 flex-wrap mb-4">
        <button onClick={() => setDark(!dark)} className="btn">Theme</button>
        <button onClick={openFilePicker} className="btn">Choose File</button>
        <button onClick={() => speak()} className="btn">Play</button>
        <button onClick={pause} className="btn">Pause</button>
        <button onClick={resume} className="btn">Resume</button>
        <button onClick={stop} className="btn">Stop</button>
        <button onClick={saveMP3} className="btn">Save MP3</button>
        <button onClick={summarize} className="btn">AI Summary</button>
        <button onClick={() => speak(bookmark)} className="btn">Resume Bookmark</button>
      </div>

      <select
        className="btn mb-4"
        onChange={(e) => setVoice(e.target.value)}
      >
        {voices.map((v) => (
          <option key={v.name}>{v.name}</option>
        ))}
      </select>

      <p className="mb-2">Detected Language: {detectLanguage()}</p>

      <input
        type="file"
        hidden
        ref={fileInputRef}
        accept="application/pdf"
        onChange={(e) => extractText(e.target.files![0])}
      />

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed p-8 rounded mb-6 text-center"
      >
        Drag & Drop PDF Here
      </div>

      {progress > 0 && (
        <div className="bg-gray-300 h-3 mb-4 rounded">
          <div
            className="bg-green-500 h-3"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {summary && (
        <div className="p-4 bg-yellow-100 text-black rounded mb-6">
          <h3 className="font-bold">Summary</h3>
          {summary}
        </div>
      )}

      <p className="whitespace-pre-wrap leading-7">{text}</p>

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
