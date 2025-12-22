import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import FollowButton from '@/components/FollowButton';
import OrganizerProfilePreview from '@/components/OrganizerProfilePreview';
import { Trophy, Users, Wallet, Share2, Calendar, Eye, ChevronRight, Award, Clock, Flame, Zap } from 'lucide-react';
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
}
interface TournamentCardProps {
  tournament: Tournament;
  isJoined?: boolean;
  onJoinClick?: () => void;
  onShareClick?: () => void;
  onExitClick?: () => void;
  onPrizeClick?: () => void;
  onSwipeJoin?: () => void;
  isLoading?: boolean;
  variant?: 'organizer' | 'creator';
  showRoomDetails?: boolean;
  organizerName?: string;
  isFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}
const TournamentCard = ({
  tournament,
  isJoined = false,
  onJoinClick,
  onShareClick,
  onExitClick,
  onPrizeClick,
  onSwipeJoin,
  isLoading = false,
  variant = 'organizer',
  showRoomDetails = false,
  organizerName,
  isFollowing = false,
  onFollowChange
}: TournamentCardProps) => {
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const spotsLeft = (tournament.max_participants || 100) - (tournament.joined_users?.length || 0);
  const prizeAmount = tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`;
  const entryFee = tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free';

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 100;
  const canSwipeJoin = !isJoined && tournament.status === 'upcoming' && spotsLeft > 0;
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canSwipeJoin) return;
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !canSwipeJoin) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    // Only allow left swipe (negative values)
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

  // Get default prize distribution if none set
  const getPrizeDistribution = () => {
    if (tournament.prize_distribution) return tournament.prize_distribution;
    // Default distribution: 50/30/20
    return [{
      position: 1,
      percentage: 50
    }, {
      position: 2,
      percentage: 30
    }, {
      position: 3,
      percentage: 20
    }];
  };
  // Check if tournament is starting soon (within 2 hours)
  const isStartingSoon = () => {
    const matchTime = new Date(tournament.start_date);
    const now = new Date();
    const timeDiff = matchTime.getTime() - now.getTime();
    return timeDiff > 0 && timeDiff < 2 * 60 * 60 * 1000;
  };

  // Check if almost full (less than 10 spots)
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0;

  return <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe indicator background */}
      {canSwipeJoin && <div className={`absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-emerald-500 to-emerald-500/50 flex items-center justify-end pr-4 transition-opacity ${swipeX < -30 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-white text-sm font-semibold flex items-center gap-1">
            <ChevronRight className="h-5 w-5 animate-pulse" />
            Join
          </div>
        </div>}
      
      <div ref={cardRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
      transform: `translateX(${swipeX}px)`,
      transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
    }} className="group bg-card rounded-2xl border border-border/50 p-5 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out relative">
        
        {/* Urgency indicators */}
        {(isStartingSoon() || isAlmostFull) && (
          <div className="absolute top-3 right-3 flex gap-1.5">
            {isStartingSoon() && (
              <div className="flex items-center gap-1 bg-amber-500/20 text-amber-600 px-2 py-1 rounded-full animate-pulse">
                <Clock className="h-3 w-3" />
                <span className="text-[10px] font-semibold">Starting Soon</span>
              </div>
            )}
            {isAlmostFull && (
              <div className="flex items-center gap-1 bg-red-500/20 text-red-600 px-2 py-1 rounded-full">
                <Flame className="h-3 w-3" />
                <span className="text-[10px] font-semibold">Almost Full</span>
              </div>
            )}
          </div>
        )}

        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-gaming font-bold text-foreground truncate group-hover:text-primary transition-colors text-xl">
                {tournament.title}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 text-primary">
                {tournament.game}
              </Badge>
              <Badge className={`text-[10px] px-2 py-0.5 capitalize ${variant === 'creator' ? 'bg-purple-500/10 text-purple-600 border-purple-500/30' : 'bg-gaming-orange/10 text-gaming-orange border-gaming-orange/30'}`}>
                {tournament.tournament_mode || 'Solo'}
              </Badge>
              <Badge className={`text-[10px] px-2 py-0.5 capitalize ${tournament.status === 'upcoming' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : tournament.status === 'ongoing' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-muted text-muted-foreground'}`}>
                {tournament.status}
              </Badge>
            </div>
            {/* Organizer Info */}
            <div className="flex items-center gap-2 mt-2">
              {organizerName && tournament.created_by && <button onClick={() => setProfilePreviewOpen(true)} className="text-xs text-muted-foreground hover:text-primary hover:underline font-medium transition-colors">
                  by {organizerName}
                </button>}
              {tournament.created_by && onFollowChange && <FollowButton organizerId={tournament.created_by} isFollowing={isFollowing} onFollowChange={onFollowChange} organizerName={organizerName} />}
            </div>
          </div>
        </div>

        {/* Organizer Profile Preview Dialog */}
        {tournament.created_by && <OrganizerProfilePreview organizerId={tournament.created_by} open={profilePreviewOpen} onOpenChange={setProfilePreviewOpen} isFollowing={isFollowing} onFollowChange={onFollowChange} />}

        {/* Stats Grid - Enhanced */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Prize Pool Card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-3 border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Prize Pool</span>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{prizeAmount}</p>
          </div>

          {/* Entry Fee Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-xl p-3 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Entry Fee</span>
            </div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{entryFee}</p>
          </div>

          {/* Players Left Card */}
          <div className={`rounded-xl p-3 border transition-colors ${isAlmostFull ? 'bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 group-hover:border-red-500/40' : 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20 group-hover:border-blue-500/40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAlmostFull ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                <Users className={`h-4 w-4 ${isAlmostFull ? 'text-red-500' : 'text-blue-500'}`} />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Spots Left</span>
            </div>
            <p className={`text-lg font-bold ${isAlmostFull ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {spotsLeft} <span className="text-xs font-normal text-muted-foreground">/ {tournament.max_participants || 100}</span>
            </p>
          </div>

          {/* Date & Time Card */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-3 border border-purple-500/20 group-hover:border-purple-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-purple-500" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Starts</span>
            </div>
            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{format(new Date(tournament.start_date), 'MMM dd')}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(tournament.start_date), 'h:mm a')}</p>
          </div>
        </div>

        {/* Room Details */}
        {isJoined && showRoomDetails && tournament.room_id && <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 mb-4 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <Eye className="h-4 w-4" />
              <span>Room: {tournament.room_id}</span>
              {tournament.room_password && <span className="text-muted-foreground">| Pass: {tournament.room_password}</span>}
            </div>
          </div>}

        {/* Action Row */}
        <div className="flex items-center gap-2">
          {isJoined ? (
            <Button onClick={onExitClick} disabled={isLoading} variant="outline" size="sm" className="flex-1 h-11 text-destructive border-destructive/50 hover:bg-destructive/10 hover:border-destructive transition-all font-semibold">
              {isLoading ? 'Processing...' : 'Exit Tournament'}
            </Button>
          ) : (
            /* Swipe to Join indicator - replaces Join button */
            canSwipeJoin ? (
              <div className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center gap-2 text-emerald-600">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-semibold">Swipe left to join</span>
                <ChevronRight className="h-4 w-4 animate-pulse" />
              </div>
            ) : (
              <div className="flex-1 h-11 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground text-sm font-medium">
                {spotsLeft <= 0 ? 'Tournament Full' : 'Not Available'}
              </div>
            )
          )}
          
          {/* Prize Distribution button */}
          <Button variant="outline" size="sm" onClick={onPrizeClick} className="h-11 px-4 hover:bg-accent hover:scale-105 transition-all font-semibold">
            <Award className="h-4 w-4 mr-1.5" />
            Prizes
          </Button>
          
          <button onClick={onShareClick} className="h-11 w-11 rounded-xl border border-border/50 flex items-center justify-center hover:bg-accent hover:scale-105 hover:border-primary/30 transition-all">
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>;
};
export default TournamentCard;