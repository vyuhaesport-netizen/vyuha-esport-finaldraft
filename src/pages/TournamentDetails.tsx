import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, 
  Users, 
  Wallet, 
  Calendar, 
  ArrowLeft,
  Loader2,
  Award,
  Gamepad2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Tournament {
  id: string;
  title: string;
  game: string;
  description: string | null;
  prize_pool: string | null;
  entry_fee: number | null;
  start_date: string;
  status: string | null;
  max_participants: number | null;
  tournament_type: string;
  joined_users: string[] | null;
  current_prize_pool: number | null;
  tournament_mode: string | null;
  prize_distribution: any;
  created_by: string | null;
}

const TournamentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [joinDialog, setJoinDialog] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournament();
    }
    if (user) {
      fetchWalletBalance();
    }
  }, [id, user]);

  const fetchTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
      toast({ title: 'Error', description: 'Tournament not found.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single();
      setWalletBalance(data?.wallet_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleJoinTournament = async () => {
    if (!tournament || !user) return;

    setJoining(true);

    try {
      const { data, error } = await supabase.rpc('process_tournament_join', {
        p_user_id: user.id,
        p_tournament_id: tournament.id,
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        error?: string; 
        entry_fee?: number;
      };

      if (!result.success) {
        toast({ 
          title: 'Cannot Join', 
          description: result.error || 'Failed to join tournament.', 
          variant: 'destructive' 
        });
        return;
      }

      toast({ 
        title: 'Joined!', 
        description: `You have successfully joined ${tournament.title}. ₹${result.entry_fee} deducted.` 
      });
      
      setJoinDialog(false);
      fetchTournament();
      fetchWalletBalance();
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast({ title: 'Error', description: 'Failed to join tournament.', variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Trophy className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-xl font-bold mb-2">Tournament Not Found</h1>
        <p className="text-muted-foreground text-sm mb-4">This tournament may have been removed or does not exist.</p>
        <Button onClick={() => navigate('/home')}>Go to Home</Button>
      </div>
    );
  }

  const spotsLeft = (tournament.max_participants || 100) - (tournament.joined_users?.length || 0);
  const isJoined = user && tournament.joined_users?.includes(user.id);
  const canJoin = !isJoined && tournament.status === 'upcoming' && spotsLeft > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={vyuhaLogo} alt="Vyuha" className="w-8 h-8 rounded-lg" />
          <div className="flex-1">
            <h1 className="font-gaming font-bold text-sm truncate">{tournament.title}</h1>
            <p className="text-xs text-muted-foreground">{tournament.game}</p>
          </div>
        </div>
      </header>

      {/* Tournament Banner */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Badge className={`capitalize ${
            tournament.tournament_type === 'creator' 
              ? 'bg-purple-500/10 text-purple-600' 
              : 'bg-primary/10 text-primary'
          }`}>
            {tournament.tournament_type}
          </Badge>
          <Badge className={`capitalize ${
            tournament.status === 'upcoming' 
              ? 'bg-emerald-500/10 text-emerald-600' 
              : tournament.status === 'ongoing'
              ? 'bg-amber-500/10 text-amber-600'
              : 'bg-muted text-muted-foreground'
          }`}>
            {tournament.status}
          </Badge>
          {tournament.tournament_mode && (
            <Badge variant="outline" className="capitalize">
              {tournament.tournament_mode}
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-gaming font-bold text-center mb-2">{tournament.title}</h1>
        <p className="text-center text-muted-foreground text-sm">{tournament.game}</p>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Trophy className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Prize Pool</span>
          </div>
          <p className="text-xl font-bold text-amber-500">
            {tournament.prize_pool || `₹${tournament.current_prize_pool || 0}`}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Wallet className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Entry Fee</span>
          </div>
          <p className="text-xl font-bold text-emerald-500">
            {tournament.entry_fee ? `₹${tournament.entry_fee}` : 'Free'}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Players</span>
          </div>
          <p className="text-xl font-bold">
            {tournament.joined_users?.length || 0}/{tournament.max_participants || 100}
          </p>
          <p className="text-xs text-muted-foreground">{spotsLeft} spots left</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-purple-500 mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Start Time</span>
          </div>
          <p className="text-sm font-bold">
            {format(new Date(tournament.start_date), 'MMM dd, yyyy')}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(tournament.start_date), 'h:mm a')}
          </p>
        </div>
      </div>

      {/* Description */}
      {tournament.description && (
        <div className="px-4 pb-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-primary" />
              Description
            </h3>
            <p className="text-sm text-muted-foreground">{tournament.description}</p>
          </div>
        </div>
      )}

      {/* Prize Distribution */}
      <div className="px-4 pb-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Prize Distribution
          </h3>
          {tournament.prize_distribution ? (
            <div className="space-y-2">
              {Object.entries(tournament.prize_distribution).map(([rank, amount]) => (
                <div key={rank} className="flex justify-between items-center bg-muted/50 rounded-lg p-3">
                  <span className="font-medium">Rank {rank}</span>
                  <span className="text-primary font-semibold">₹{String(amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-yellow-500/10 rounded-lg p-3">
                <span className="font-medium">🥇 1st Place</span>
                <span className="text-yellow-600 font-semibold">50%</span>
              </div>
              <div className="flex justify-between items-center bg-gray-300/20 rounded-lg p-3">
                <span className="font-medium">🥈 2nd Place</span>
                <span className="text-muted-foreground font-semibold">30%</span>
              </div>
              <div className="flex justify-between items-center bg-orange-500/10 rounded-lg p-3">
                <span className="font-medium">🥉 3rd Place</span>
                <span className="text-orange-600 font-semibold">20%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Join Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        {!user ? (
          <Button className="w-full" onClick={() => navigate('/')}>
            Login to Join
          </Button>
        ) : isJoined ? (
          <div className="flex items-center justify-center gap-2 py-2 bg-emerald-500/10 rounded-lg text-emerald-600">
            <Clock className="h-4 w-4" />
            <span className="font-medium">You have joined this tournament</span>
          </div>
        ) : canJoin ? (
          <Button 
            className="w-full bg-gradient-to-r from-primary to-primary/80" 
            onClick={() => setJoinDialog(true)}
          >
            Join Tournament • ₹{tournament.entry_fee || 0}
          </Button>
        ) : (
          <Button className="w-full" disabled>
            {spotsLeft <= 0 ? 'Tournament Full' : 'Registration Closed'}
          </Button>
        )}
      </div>

      {/* Join Dialog */}
      <Dialog open={joinDialog} onOpenChange={setJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Tournament</DialogTitle>
            <DialogDescription>
              Confirm your entry for {tournament.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entry Fee</span>
                <span className="font-semibold">₹{tournament.entry_fee || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your Balance</span>
                <span className="font-semibold">₹{walletBalance}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">After Joining</span>
                <span className={`font-semibold ${walletBalance - (tournament.entry_fee || 0) < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  ₹{walletBalance - (tournament.entry_fee || 0)}
                </span>
              </div>
            </div>

            {walletBalance < (tournament.entry_fee || 0) && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                Insufficient balance. Please add ₹{(tournament.entry_fee || 0) - walletBalance} to your wallet.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleJoinTournament}
              disabled={joining || walletBalance < (tournament.entry_fee || 0)}
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm & Join'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentDetails;
