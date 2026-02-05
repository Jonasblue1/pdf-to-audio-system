"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setText(""); // reset previous text
      setAudio(null);
      extractTextFromPDF(e.target.files[0]);
    }
  };

  // Extract text from PDF using pdfjs-dist
  const extractTextFromPDF = async (file: File) => {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");

    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n\n";
    }
    setText(fullText);
  };

  // Play text using browser TTS
  const handlePlay = () => {
    if (!text) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US"; // default
    utterance.onend = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);

    // Save audio to variable for future use
    setAudio(new Audio());
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>PDF to Audio System (Base Version)</h1>

      {/* File selector */}
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <div style={{ margin: "20px 0", minHeight: 100, border: "1px solid #ccc", padding: 10 }}>
        {file ? `Selected: ${file.name}` : "No file selected"}
      </div>

      {/* Text display */}
      <textarea
        value={text}
        readOnly
        rows={10}
        style={{ width: "100%", padding: 10, fontSize: 16 }}
      />

      {/* Controls */}
      <div style={{ marginTop: 20 }}>
        <button onClick={handlePlay} style={{ padding: "10px 20px", marginRight: 10 }}>
          {speaking ? "Stop" : "Play"}
        </button>
      </div>
    </div>
  );
}
