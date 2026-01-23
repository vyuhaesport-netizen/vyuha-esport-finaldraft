import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import OrganizerProfilePreview from '@/components/OrganizerProfilePreview';
import { Trophy, Users, Wallet, Share2, Calendar, Eye, ChevronLeft, Clock, Youtube, Instagram, Gift, ScrollText, Gamepad2, Radio } from 'lucide-react';

interface Tournament {
  id: string;
  title: string;
  game: string;
  prize_pool: string | null;
  entry_fee: number | null;
  start_date: string;
  status: string | null;
  max_participants: number | null;
  tournament_type: string;
  joined_users: string[] | null;
  current_prize_pool: number | null;
  tournament_mode: string | null;
  room_id?: string | null;
  room_password?: string | null;
  prize_distribution?: any;
  created_by?: string | null;
  registration_deadline?: string | null;
  youtube_link?: string | null;
  instagram_link?: string | null;
  is_giveaway?: boolean | null;
  rules?: string | null;
}

interface TournamentCardProps {
  tournament: Tournament;
  isJoined?: boolean;
  onJoinClick?: () => void;
  onShareClick?: () => void;
  onExitClick?: () => void;
  onPrizeClick?: () => void;
  onRulesClick?: () => void;
  onSwipeJoin?: () => void;
  isLoading?: boolean;
  variant?: 'organizer' | 'creator';
  showRoomDetails?: boolean;
  organizerName?: string;
  joinDisabled?: boolean;
  joinDisabledReason?: string;
  exitDisabled?: boolean;
  exitDisabledReason?: string;
}

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'Closed';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h left`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m left`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s left`;
  } else {
    return `${seconds}s left`;
  }
};

const TournamentCard = ({
  tournament,
  isJoined = false,
  onJoinClick,
  onShareClick,
  onExitClick,
  onPrizeClick,
  onRulesClick,
  onSwipeJoin,
  isLoading = false,
  variant = 'organizer',
  showRoomDetails = false,
  organizerName,
  joinDisabled = false,
  joinDisabledReason,
  exitDisabled = false,
  exitDisabledReason
}: TournamentCardProps) => {
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [isDeadlineSoon, setIsDeadlineSoon] = useState(false);
  
  const spotsLeft = (tournament.max_participants || 100) - (tournament.joined_users?.length || 0);
  const prizeAmount = tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`;
  const entryFee = tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free';
  const playerCount = tournament.joined_users?.length || 0;
  const maxPlayers = tournament.max_participants || 100;

  useEffect(() => {
    if (!tournament.registration_deadline) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const deadline = new Date(tournament.registration_deadline!).getTime();
      const now = Date.now();
      const remaining = deadline - now;
      
      setCountdown(formatCountdown(remaining));
      setIsDeadlineSoon(remaining > 0 && remaining < 60 * 60 * 1000);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [tournament.registration_deadline]);

  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 100;
  const canSwipeJoin = !isJoined && tournament.status === 'upcoming' && spotsLeft > 0 && !joinDisabled;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipeJoin) return;
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !canSwipeJoin) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    if (diff < 0) {
      setSwipeX(Math.max(diff, -150));
    }
  };
  
  const handleTouchEnd = () => {
    if (!canSwipeJoin) return;
    if (swipeX < -SWIPE_THRESHOLD && onSwipeJoin) {
      onSwipeJoin();
    }
    setSwipeX(0);
    setIsSwiping(false);
  };

  const getModeColor = () => {
    if (variant === 'creator') return 'from-purple-500 to-pink-500';
    return 'from-primary to-gaming-blue';
  };

  const getStatusBadge = () => {
    switch (tournament.status) {
      case 'upcoming':
        return <span className="badge-upcoming"><span className="w-1.5 h-1.5 bg-white rounded-full" />Live</span>;
      case 'ongoing':
        return <span className="badge-live"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />In Progress</span>;
      default:
        return <span className="badge-completed">{tournament.status}</span>;
    }
  };

  return (
    <div className="relative">
      <div 
        ref={cardRef} 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove} 
        onTouchEnd={handleTouchEnd} 
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }} 
        className="bg-card border border-border/60 rounded-lg p-2.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        {/* Swipe indicator */}
        {canSwipeJoin && (
          <div className={`absolute inset-y-0 right-0 w-12 pointer-events-none rounded-r-lg bg-gradient-to-l from-success to-success/50 flex items-center justify-end pr-1.5 transition-opacity ${swipeX < -30 ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-white text-[9px] font-bold">Join</span>
          </div>
        )}
        
        {/* Header - More Compact */}
        <div className="flex items-start justify-between gap-1.5 mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <h3 className="font-semibold text-xs text-foreground truncate">
                {tournament.title}
              </h3>
              {tournament.is_giveaway && (
                <Badge className="text-[8px] px-1 py-0 bg-gradient-to-r from-success to-gaming-cyan text-white border-0 font-bold">
                  <Gift className="h-2 w-2 mr-0.5" />
                  Giveaway
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Gamepad2 className="h-2.5 w-2.5" />
                {tournament.game}
              </span>
              <Badge className={`text-[8px] px-1 py-0 capitalize bg-gradient-to-r ${getModeColor()} text-white border-0`}>
                {tournament.tournament_mode || 'Solo'}
              </Badge>
              {getStatusBadge()}
            </div>
            {organizerName && tournament.created_by && (
              <button 
                onClick={() => setProfilePreviewOpen(true)} 
                className="text-[9px] text-muted-foreground hover:text-primary hover:underline transition-colors mt-0.5"
              >
                by {organizerName}
              </button>
            )}
          </div>
        </div>

        {tournament.created_by && (
          <OrganizerProfilePreview 
            organizerId={tournament.created_by} 
            open={profilePreviewOpen} 
            onOpenChange={setProfilePreviewOpen}
          />
        )}

        {/* Deadline Countdown - Compact */}
        {countdown && !isJoined && (
          <div className={`flex items-center gap-1 mb-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium ${
            isDeadlineSoon 
              ? 'bg-destructive/10 text-destructive animate-pulse' 
              : 'bg-warning/10 text-warning'
          }`}>
            <Clock className="h-2.5 w-2.5" />
            <span>Closes in {countdown}</span>
          </div>
        )}

        {/* Stats Grid - Ultra Compact */}
        <div className="grid grid-cols-4 gap-1 mb-1.5">
          <div className="bg-muted/50 rounded p-1.5 text-center border border-border/50">
            <Trophy className="h-3 w-3 text-warning mx-auto mb-0.5" />
            <p className="text-[10px] font-bold text-warning">{prizeAmount}</p>
            <p className="text-[8px] text-muted-foreground">Prize</p>
          </div>
          <div className="bg-muted/50 rounded p-1.5 text-center border border-border/50">
            <Wallet className="h-3 w-3 text-success mx-auto mb-0.5" />
            <p className="text-[10px] font-bold text-success">{tournament.is_giveaway ? '₹1' : entryFee}</p>
            <p className="text-[8px] text-muted-foreground">Entry</p>
          </div>
          <div className="bg-muted/50 rounded p-1.5 text-center border border-border/50">
            <Users className="h-3 w-3 text-primary mx-auto mb-0.5" />
            <p className="text-[10px] font-bold">{playerCount}/{maxPlayers}</p>
            <p className="text-[8px] text-muted-foreground">Players</p>
          </div>
          <div className="bg-muted/50 rounded p-1.5 text-center border border-border/50">
            <Calendar className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
            <p className="text-[10px] font-bold">{format(new Date(tournament.start_date), 'MMM d')}</p>
            <p className="text-[8px] text-muted-foreground">{format(new Date(tournament.start_date), 'h:mm a')}</p>
          </div>
        </div>

        {/* Room Details */}
        {isJoined && showRoomDetails && tournament.room_id && (
          <div className="p-1.5 bg-success/10 rounded border border-success/20 mb-1.5">
            <div className="flex items-center gap-1.5 text-success text-[10px] font-medium">
              <Eye className="h-3 w-3" />
              <span>Room: {tournament.room_id}</span>
              {tournament.room_password && (
                <span className="text-muted-foreground">• Pass: {tournament.room_password}</span>
              )}
            </div>
          </div>
        )}

        {/* Social Links - Compact */}
        {(tournament.youtube_link || tournament.instagram_link) && (
          <div className="flex items-center gap-1 mb-1.5">
            {tournament.youtube_link && (
              <a 
                href={tournament.youtube_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[9px] font-medium hover:bg-red-500/20 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Youtube className="h-2.5 w-2.5" />
                YouTube
              </a>
            )}
            {tournament.instagram_link && (
              <a 
                href={tournament.instagram_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-500 text-[9px] font-medium hover:bg-pink-500/20 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="h-2.5 w-2.5" />
                Instagram
              </a>
            )}
          </div>
        )}

        {/* Actions - Compact */}
        <div className="flex items-center gap-1">
          {isJoined ? (
            exitDisabled ? (
              <div className="flex-1 h-7 rounded bg-warning/10 border border-warning/30 flex items-center justify-center text-warning text-[9px] font-medium">
                {exitDisabledReason || 'Exit not allowed'}
              </div>
            ) : (
              <Button 
                onClick={onExitClick} 
                disabled={isLoading} 
                variant="outline" 
                className="flex-1 h-7 text-[10px] text-destructive border-destructive/50 hover:bg-destructive/10 rounded"
              >
                {isLoading ? 'Processing...' : 'Exit Tournament'}
              </Button>
            )
          ) : canSwipeJoin ? (
            <Button 
              onClick={onJoinClick} 
              disabled={isLoading} 
              className="flex-1 h-7 text-[10px] rounded bg-gradient-to-r from-success to-gaming-green hover:opacity-90"
            >
              {isLoading ? 'Processing...' : 'Join Now'}
            </Button>
          ) : joinDisabled ? (
            <div className="flex-1 h-7 rounded bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive text-[9px] font-medium">
              {joinDisabledReason || 'Registration Closed'}
            </div>
          ) : (
            <div className="flex-1 h-7 rounded bg-muted/50 flex items-center justify-center text-muted-foreground text-[9px] font-medium">
              {spotsLeft <= 0 ? 'Tournament Full' : 'Not Available'}
            </div>
          )}
          
          <Button 
            variant="outline" 
            onClick={onRulesClick} 
            className="h-7 px-1.5 rounded gap-0.5 text-[9px]"
            size="sm"
          >
            <ScrollText className="h-2.5 w-2.5" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onPrizeClick} 
            className="h-7 px-1.5 rounded gap-0.5 text-[9px]"
            size="sm"
          >
            <Trophy className="h-2.5 w-2.5" />
          </Button>
          
          <Button 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onShareClick?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="h-7 w-7 p-0 rounded touch-manipulation"
            size="sm"
          >
            <Share2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
      
      {/* Swipe indicator - Smaller */}
      {canSwipeJoin && (
        <div className="flex items-center justify-center gap-1 mt-1 text-success/70">
          <ChevronLeft className="h-2.5 w-2.5 animate-bounce-soft" />
          <span className="text-[9px] font-medium">Swipe to join</span>
          <ChevronLeft className="h-2.5 w-2.5 animate-bounce-soft" />
        </div>
      )}
    </div>
  );
};

export default TournamentCard;