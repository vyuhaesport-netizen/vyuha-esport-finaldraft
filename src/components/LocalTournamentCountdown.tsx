import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface LocalTournamentCountdownProps {
  targetDate: Date;
  onTimeUp?: () => void;
  showRecalculationWarning?: boolean;
}

const LocalTournamentCountdown = ({ targetDate, onTimeUp, showRecalculationWarning = false }: LocalTournamentCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);
  const [showRecalcWarning, setShowRecalcWarning] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        onTimeUp?.();
        return;
      }

      // Show recalculation warning 2 minutes before start
      if (showRecalculationWarning && difference <= 2 * 60 * 1000 && difference > 0) {
        setShowRecalcWarning(true);
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onTimeUp, showRecalculationWarning]);

  if (isExpired) {
    return (
      <div className="flex items-center justify-center gap-2 text-green-600">
        <Clock className="h-4 w-4" />
        <span className="font-semibold">Tournament Time!</span>
      </div>
    );
  }

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-primary/10 rounded-lg px-3 py-2 min-w-[50px]">
        <span className="text-xl font-bold text-primary">{value.toString().padStart(2, '0')}</span>
      </div>
      <span className="text-xs text-muted-foreground mt-1">{label}</span>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <TimeUnit value={timeLeft.days} label="Days" />
        <span className="text-xl font-bold text-primary">:</span>
        <TimeUnit value={timeLeft.hours} label="Hrs" />
        <span className="text-xl font-bold text-primary">:</span>
        <TimeUnit value={timeLeft.minutes} label="Min" />
        <span className="text-xl font-bold text-primary">:</span>
        <TimeUnit value={timeLeft.seconds} label="Sec" />
      </div>
      {showRecalcWarning && (
        <div className="flex items-center justify-center gap-2 text-orange-500 text-sm animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          <span>Prize pool will be recalculated soon!</span>
        </div>
      )}
    </div>
  );
};

export default LocalTournamentCountdown;