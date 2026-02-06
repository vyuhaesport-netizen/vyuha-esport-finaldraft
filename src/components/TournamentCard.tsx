import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import OrganizerProfilePreview from '@/components/OrganizerProfilePreview';
 import SocialLinksDrawer from '@/components/SocialLinksDrawer';
 import { Trophy, Users, Wallet, Share2, Calendar, Eye, ChevronLeft, Clock, Gift, ScrollText } from 'lucide-react';

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
  whatsapp_link?: string | null;
  discord_link?: string | null;
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

const extractYouTubeHandle = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const match = url.match(/(?:youtube\.com\/@|youtube\.com\/channel\/|youtube\.com\/c\/|youtu\.be\/)([^\/\?]+)/i);
    return match ? `@${match[1].replace('@', '')}` : null;
  } catch {
    return null;
  }
};

const extractInstagramHandle = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const match = url.match(/instagram\.com\/([^\/\?]+)/i);
    return match ? `@${match[1]}` : null;
  } catch {
    return null;
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
  
  const ytHandle = extractYouTubeHandle(tournament.youtube_link);
  const instaHandle = extractInstagramHandle(tournament.instagram_link);
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
        className="glass-card rounded-xl p-3 hover:shadow-lg transition-all duration-200 border-2 border-white/30"
      >
        {/* Swipe indicator */}
        {canSwipeJoin && (
          <div className={`absolute inset-y-0 right-0 w-14 pointer-events-none rounded-r-xl bg-gradient-to-l from-success to-success/50 flex items-center justify-end pr-2 transition-opacity ${swipeX < -30 ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-white text-xs font-bold">JOIN</span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-tight">
              {tournament.title}
            </h3>
            {organizerName && tournament.created_by && (
              <button 
                onClick={() => setProfilePreviewOpen(true)} 
                className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors mt-0.5"
              >
                by {organizerName}
              </button>
            )}
            {/* Social Handles */}
            {(ytHandle || instaHandle) && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {ytHandle && (
                  <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    {ytHandle}
                  </span>
                )}
                {instaHandle && (
                  <span className="text-[10px] text-pink-500 font-medium flex items-center gap-0.5">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    {instaHandle}
                  </span>
                )}
              </div>
            )}
          </div>
          {tournament.is_giveaway && (
            <Badge className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-success to-gaming-cyan text-white border-0 font-bold flex-shrink-0 shadow-md">
              <Gift className="h-3 w-3 mr-1" />
              Giveaway
            </Badge>
          )}
        </div>

        {tournament.created_by && (
          <OrganizerProfilePreview 
            organizerId={tournament.created_by} 
            open={profilePreviewOpen} 
            onOpenChange={setProfilePreviewOpen}
          />
        )}

        {/* Deadline Countdown */}
        {countdown && !isJoined && (
          <div className={`flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
            isDeadlineSoon 
              ? 'bg-destructive/15 text-destructive border border-destructive/30 animate-pulse' 
              : 'bg-warning/15 text-warning border border-warning/30'
          }`}>
            <Clock className="h-3 w-3" />
            <span>Closes in {countdown}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          <div className="bg-warning/10 rounded-lg p-2 text-center border border-warning/25">
            <Trophy className="h-3.5 w-3.5 text-warning mx-auto mb-0.5" />
            <p className="text-xs font-bold text-warning">{prizeAmount}</p>
            <p className="text-[9px] text-muted-foreground">Prize</p>
          </div>
          <div className="bg-success/10 rounded-lg p-2 text-center border border-success/25">
            <Wallet className="h-3.5 w-3.5 text-success mx-auto mb-0.5" />
            <p className="text-xs font-bold text-success">{tournament.is_giveaway ? '₹1' : entryFee}</p>
            <p className="text-[9px] text-muted-foreground">Entry</p>
          </div>
          <div className="bg-primary/10 rounded-lg p-2 text-center border border-primary/25">
            <Users className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
            <p className="text-xs font-bold text-foreground">{playerCount}/{maxPlayers}</p>
            <p className="text-[9px] text-muted-foreground">Players</p>
          </div>
          <div className="bg-muted/60 rounded-lg p-2 text-center border border-white/20">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
            <p className="text-xs font-bold text-foreground">{format(new Date(tournament.start_date), 'MMM d')}</p>
            <p className="text-[9px] text-muted-foreground">{format(new Date(tournament.start_date), 'h:mm a')}</p>
          </div>
        </div>

        {/* Room Details */}
        {isJoined && showRoomDetails && tournament.room_id && (
          <div className="p-2.5 bg-success/10 rounded-lg border border-success/30 mb-2">
            <div className="flex items-center gap-2 text-success text-xs font-semibold">
              <Eye className="h-3.5 w-3.5" />
              <span>Room: {tournament.room_id}</span>
              {tournament.room_password && (
                <span className="text-muted-foreground">• Pass: {tournament.room_password}</span>
              )}
            </div>
          </div>
        )}

        {/* Social Links */}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {isJoined ? (
            exitDisabled ? (
              <div className="flex-1 h-8 rounded-lg bg-warning/15 border border-warning/30 flex items-center justify-center text-warning text-xs font-medium">
                {exitDisabledReason || 'Exit not allowed'}
              </div>
            ) : (
              <Button 
                onClick={onExitClick} 
                disabled={isLoading} 
                variant="outline" 
                className="flex-1 h-8 text-xs text-destructive border border-destructive/50 hover:bg-destructive/10 rounded-lg font-semibold"
              >
                {isLoading ? 'Processing...' : 'Exit'}
              </Button>
            )
          ) : canSwipeJoin ? (
            <Button 
              onClick={onJoinClick} 
              disabled={isLoading} 
              className="flex-1 h-8 text-xs rounded-lg bg-success hover:bg-success/90 font-semibold"
            >
              {isLoading ? 'Processing...' : 'Join Now'}
            </Button>
          ) : joinDisabled ? (
            <div className="flex-1 h-8 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive text-xs font-medium">
              {joinDisabledReason || 'Closed'}
            </div>
          ) : (
            <div className="flex-1 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground text-xs font-medium">
              {spotsLeft <= 0 ? 'Full' : 'N/A'}
            </div>
          )}
          
          <Button 
            variant="outline" 
            onClick={onRulesClick} 
            className="h-8 w-8 p-0 rounded-lg border"
            size="sm"
          >
            <ScrollText className="h-3.5 w-3.5" />
          </Button>
          
           <SocialLinksDrawer
             links={{
               youtube_link: tournament.youtube_link,
               instagram_link: tournament.instagram_link,
               whatsapp_link: tournament.whatsapp_link,
               discord_link: tournament.discord_link,
             }}
             tournamentTitle={tournament.title}
           />
           
          <Button 
            variant="outline" 
            onClick={onPrizeClick} 
            className="h-8 w-8 p-0 rounded-lg border"
            size="sm"
          >
            <Trophy className="h-3.5 w-3.5" />
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
            className="h-8 w-8 p-0 rounded-lg border touch-manipulation"
            size="sm"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Swipe indicator */}
      {canSwipeJoin && (
        <div className="flex items-center justify-center gap-2 mt-2 text-success/70">
          <ChevronLeft className="h-3 w-3 animate-bounce-soft" />
          <span className="text-[10px] font-semibold">Swipe to join</span>
          <ChevronLeft className="h-3 w-3 animate-bounce-soft" />
        </div>
      )}
    </div>
  );
};

export default TournamentCard;