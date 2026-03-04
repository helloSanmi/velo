import { useEffect, useRef, useState } from 'react';
import { getSpeechRecognition } from './copilotUtils';

interface UseCopilotRecorderParams {
  isOpen: boolean;
  setQuery: (value: string) => void;
}

export const useCopilotRecorder = ({ isOpen, setQuery }: UseCopilotRecorderParams) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecorderSupported, setIsRecorderSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const clearAudio = () => {
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const stopStreamTracks = () => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    recognitionRef.current?.stop();
    stopStreamTracks();
    setIsRecording(false);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setIsRecorderSupported(false);
      return;
    }
    setIsRecorderSupported(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0) {
          clearAudio();
          setAudioUrl(URL.createObjectURL(blob));
        }
      };
      recorder.start();

      const Recognition = getSpeechRecognition();
      if (Recognition) {
        const recognition = new Recognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const text = Array.from(event.results)
            .map((result) => result[0]?.transcript || '')
            .join(' ')
            .trim();
          setQuery(text);
        };
        recognitionRef.current = recognition;
        recognition.start();
      }
      setIsRecording(true);
    } catch {
      setIsRecorderSupported(false);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setQuery('');
      clearAudio();
    }
  }, [isOpen, setQuery]);

  useEffect(() => () => {
    stopRecording();
    clearAudio();
  }, []);

  return {
    isRecording,
    audioUrl,
    isRecorderSupported,
    stopRecording,
    startRecording,
    clearAudio
  };
};
