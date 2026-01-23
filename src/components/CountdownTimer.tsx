import { useState, useEffect, useMemo, memo } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: Date | string;
  label?: string;
  onComplete?: () => void;
  className?: string;
  showIcon?: boolean;
  compact?: boolean;
}

const CountdownTimer = memo(({ 
  targetDate, 
  label, 
  onComplete, 
  className = '',
  showIcon = true,
  compact = false
}: CountdownTimerProps) => {
  // Memoize target timestamp to prevent unnecessary effect triggers
  const targetTimestamp = useMemo(() => {
    if (typeof targetDate === 'string') {
      return new Date(targetDate).getTime();
    }
    return targetDate.getTime();
  }, [typeof targetDate === 'string' ? targetDate : targetDate.getTime()]);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>(() => {
    const now = Date.now();
    const difference = targetTimestamp - now;
    if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, total: difference };
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const difference = targetTimestamp - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        onComplete?.();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, total: difference });
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetTimestamp, onComplete]);

  if (timeLeft.total <= 0) {
    return null;
  }

  const formatTime = () => {
    if (compact) {
      if (timeLeft.days > 0) {
        return `${timeLeft.days}d ${timeLeft.hours}h`;
      }
      if (timeLeft.hours > 0) {
        return `${timeLeft.hours}h ${timeLeft.minutes}m`;
      }
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    }

    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
    if (timeLeft.hours > 0) parts.push(`${timeLeft.hours}h`);
    if (timeLeft.minutes > 0) parts.push(`${timeLeft.minutes}m`);
    if (timeLeft.seconds >= 0 && timeLeft.days === 0) parts.push(`${timeLeft.seconds}s`);
    return parts.join(' ');
  };

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      {showIcon && <Clock className="h-3 w-3" />}
      {label && <span className="text-muted-foreground">{label}</span>}
      <span className="font-mono font-medium">{formatTime()}</span>
    </div>
  );
});

CountdownTimer.displayName = 'CountdownTimer';

export default CountdownTimer;
