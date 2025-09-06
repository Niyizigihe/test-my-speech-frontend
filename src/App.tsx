import { useRef, useState, type JSX } from "react";
import "./App.css";
import PassageSelector from "./components/PassageSelector";

export default function App(): JSX.Element {
  const [targetText, setTargetText] = useState(
    "When we speak, clarity and confidence matter. This is a sample passage for testing."
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [serverResult, setServerResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);

  const startRecording = async () => {
    setError(null);
    setServerResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      // Some browsers require a codec check; audio/webm generally OK in Chrome
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      startTimeRef.current = Date.now();

      mr.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        try {
          // Build blob and file
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const file = new File([blob], `recording-${Date.now()}.webm`, {
            type: "audio/webm",
          });

          // Show local playback
          const url = URL.createObjectURL(blob);
          setAudioURL(url);

          // Compute duration
          const durationSeconds = startTimeRef.current
            ? (Date.now() - startTimeRef.current) / 1000
            : 0;

          // Upload
          const form = new FormData();
          form.append("audio", file);
          form.append("targetText", targetText);
          form.append("durationSeconds", String(durationSeconds));

          setIsProcessing(true);
          const res = await fetch("http://localhost:3000/api/score", {
            method: "POST",
            body: form,
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Server error ${res.status} ${txt}`);
          }

          const data = await res.json();
          setServerResult(data);
        } catch (err: any) {
          console.error("Upload/processing error:", err);
          setError(err.message || "Processing failed");
        } finally {
          setIsProcessing(false);
        }
      };

      mr.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("startRecording error:", err);
      setError(err?.message || "Could not access microphone");
    }
  };

  const stopRecording = () => {
    try {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        mr.stop();
        // stop tracks to release mic
        // @ts-ignore - stream exists on MediaRecorder in browsers
        mr.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      }
    } catch (err) {
      console.warn("stopRecording warning:", err);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="app-root">
      <div className="card">
        <h1 className="title">Test My Speech</h1>

        {/* <label className="label">Passage to read</label> */}
        {/* <PassageSelector onSelect={setTargetText} /> */}
        <PassageSelector targetText={targetText} onSelect={setTargetText} />


        <textarea
          className="passage"
          rows={5}
          value={targetText}
          onChange={(e) => setTargetText(e.target.value)}
        />

        <div className="controls">
          {!isRecording ? (
            <button
              className="btn btn-start"
              onClick={startRecording}
              disabled={isProcessing}
            >
              🎙️ Start Recording
            </button>
          ) : (
            <button className="btn btn-stop" onClick={stopRecording}>
              ⏹ Stop
            </button>
          )}

          <div className="status-group">
            {isRecording && <div className="status recording">🔴 Recording…</div>}
            {isProcessing && (
              <div className="status processing">
                <span className="spinner" /> Processing…
              </div>
            )}
            {error && <div className="status error">⚠️ {error}</div>}
          </div>
        </div>

        {audioURL && (
          <div className="section">
            <label className="label">Your recording</label>
            <audio src={audioURL} controls className="audio-player" />
          </div>
        )}

        {serverResult && (
          <div className="result">
            <div className="result-row">
              <div className="result-title">Final Score</div>
              <div className="result-value">
                {typeof serverResult.score === "number"
                  ? serverResult.score.toFixed(1)
                  : serverResult.score}{" "}
                / 10
              </div>
            </div>

            <div className="result-row">
              <div className="result-title">Estimated WPM</div>
              <div className="result-value">
                {serverResult.wordsPerMinute
                  ? Number(serverResult.wordsPerMinute).toFixed(0)
                  : "N/A"}
              </div>
            </div>

            <div className="result-row">
              <div className="result-title">Accuracy</div>
              <div className="result-value">
                {serverResult.accuracy ?? "N/A"}
              </div>
            </div>

            <div className="section">
              <div className="label">Transcript</div>
              <div className="transcript">
                {serverResult.transcript ?? <i>No transcript</i>}
              </div>
            </div>

            <div className="section">
              <div className="label">Feedback</div>
              <ul className="feedback-list">
                {Array.isArray(serverResult.feedback)
                  ? serverResult.feedback.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))
                  : <li>{String(serverResult.feedback)}</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
