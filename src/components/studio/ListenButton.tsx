import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Pause, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { edgeFetch } from "@/lib/edgeFetch";
import { toast } from "sonner";

interface ListenButtonProps {
  text: string;
  className?: string;
  label?: string;
}

/** Strips markdown/figure markers so TTS reads clean prose. */
function cleanForTts(text: string): string {
  return text
    .replace(/\[FIG:\d+\]/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function ListenButton({ text, className, label = "Ascolta" }: ListenButtonProps) {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  }, []);

  const play = useCallback(async () => {
    if (playing) { stop(); return; }
    const cleaned = cleanForTts(text);
    if (!cleaned) return;
    try {
      setLoading(true);
      const data = await edgeFetch<{ audioContent: string }>("text-to-speech", { text: cleaned });
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onpause = () => { /* keep state in sync if user pauses externally */ };
      await audio.play();
      setPlaying(true);
    } catch (e) {
      toast.error("Impossibile riprodurre l'audio");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [text, playing, stop]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={play}
      disabled={loading}
      className={cn("rounded-full gap-1.5 h-8 px-3", className)}
      aria-label={playing ? "Ferma lettura" : "Ascolta lettura"}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : playing ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      <span className="label-medium">{playing ? "Stop" : label}</span>
    </Button>
  );
}