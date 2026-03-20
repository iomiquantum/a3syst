import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface Props {
  startTime: Date;
  timeoutMinutes: number;
}

const InactivityTimer = ({ startTime, timeoutMinutes }: Props) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    const calc = () => {
      const elapsed = (Date.now() - startTime.getTime()) / 1000;
      const total = timeoutMinutes * 60;
      return Math.floor(total - elapsed);
    };

    setRemainingSeconds(calc());
    const interval = setInterval(() => setRemainingSeconds(calc()), 1000);
    return () => clearInterval(interval);
  }, [startTime, timeoutMinutes]);

  if (remainingSeconds > timeoutMinutes * 60) return null;

  const mm = Math.max(0, Math.floor(remainingSeconds / 60));
  const ss = Math.max(0, remainingSeconds % 60);

  const label =
    remainingSeconds <= 0
      ? remainingSeconds < -60
        ? "Pendiente de mover"
        : "Procesando..."
      : `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")} restantes`;

  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
      <Clock className="w-2.5 h-2.5" />
      {label}
    </span>
  );
};

export default InactivityTimer;
