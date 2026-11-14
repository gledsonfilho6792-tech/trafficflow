"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import {
  object,
  text as s,
  type Row,
  type WorkspaceData,
} from "@/lib/workspace/types";
export function NoticeToast({ data }: { data: WorkspaceData }) {
  const last = useRef<string | null>(null),
    [notice, setNotice] = useState<Row | null>(null);
  useEffect(() => {
    const latest = data.notifications[0],
      previous = last.current;
    last.current = latest?.id || null;
    if (!latest || !previous || previous === latest.id) return;
    const timer = setTimeout(() => {
      setNotice(latest);
      if (
        object(data.preferences.notifications).sound === true &&
        latest.kind === "sale"
      ) {
        try {
          const audio = new AudioContext(),
            osc = audio.createOscillator(),
            gain = audio.createGain();
          osc.connect(gain);
          gain.connect(audio.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.035;
          void audio.resume();
          osc.start();
          osc.stop(audio.currentTime + 0.15);
          osc.onended = () => void audio.close();
        } catch {}
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [data.notifications, data.preferences.notifications]);
  if (!notice) return null;
  return (
    <aside className="tf-notice-toast" role="status">
      <Bell size={20} />
      <div>
        <strong>{s(notice, "title")}</strong>
        <p className="tf-money">{s(notice, "body")}</p>
        <Link href={`/project/${data.project.id}/notifications`}>
          Ver notificações ↗
        </Link>
      </div>
      <button onClick={() => setNotice(null)} aria-label="Fechar notificação">
        <X size={15} />
      </button>
    </aside>
  );
}
