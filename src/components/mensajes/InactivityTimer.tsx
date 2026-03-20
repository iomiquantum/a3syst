import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { formatElapsedTimeoutCountdown } from "./seguimientoTime";

interface Props {
  startTime: Date;
  timeoutMinutes: number;
}

const InactivityTimer = ({ startTime, timeoutMinutes }: Props) => {
  const [label, setLabel] = useState("");
  const [expired, setExpired] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);

  useEffect(() => {
    const calc = () => {
      const nextState = formatElapsedTimeoutCountdown(startTime.toISOString(), timeoutMinutes);
      setLabel(nextState.label);
      setExpired(nextState.expired);
      setTotalSeconds(nextState.totalSeconds);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [startTime, timeoutMinutes]);

  if (totalSeconds > timeoutMinutes * 60) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
      <Clock className="w-2.5 h-2.5" />
      {expired ? (label === "Pendiente" ? "Pendiente de mover" : label) : `${label} restantes`}
    </span>
  );
};

export default InactivityTimer;
