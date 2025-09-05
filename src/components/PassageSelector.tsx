import React, { useState } from "react";

interface Passage {
  id: number;
  level: string;
  text: string;
}

const PassageSelector: React.FC<{ targetText: string; onSelect: (text: string) => void }> = ({ targetText, onSelect }) => {
  const [loading, setLoading] = useState(false);

  const fetchRandomPassage = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/passages");
      const data: Passage[] = await res.json();
      const randomIndex = Math.floor(Math.random() * data.length);
      const selectedPassage = data[randomIndex];
      onSelect(selectedPassage.text);
    } catch (err) {
      console.error("Error fetching passages:", err);
    } finally {
      setLoading(false);
    }
  };

  const speakText = () => {
    if (!targetText) return;
    const utterance = new SpeechSynthesisUtterance(targetText);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  return (
    <div>
      <h2>📖 Passage Tools</h2>
      <button onClick={fetchRandomPassage} disabled={loading}>
        {loading ? "Loading..." : "Get Random Passage"}
      </button>
      <button onClick={speakText} disabled={!targetText}>
        🔊 Play Text
      </button>
    </div>
  );
};

export default PassageSelector;
