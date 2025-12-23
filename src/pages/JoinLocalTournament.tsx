import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Gamepad2,
  Users,
  Calendar,
  Trophy,
  Loader2,
  Wallet,
  Building2,
  CheckCircle,
  Key,
  Lock,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import LocalTournamentCountdown from '@/components/LocalTournamentCountdown';

interface LocalTournament {
  id: string;
  institution_name: string;
  tournament_name: string;
  game: string;
  tournament_mode: string;
  entry_fee: number;
  max_participants: number;
  tournament_date: string;
  current_prize_pool: number;
  joined_users: string[];
  status: string;
  room_id: string | null;
  room_password: string | null;
  prize_distribution: Record<string, number>;
}

const JoinLocalTournamentPage = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [tournament, setTournament] = useState<LocalTournament | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
    }
    if (code) {
      searchTournament();
    } else {
      setLoading(false);
    }
  }, [code, user]);

  const fetchWalletBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .maybeSingle();
    setWalletBalance(data?.wallet_balance || 0);
  };

  const searchTournament = async () => {
    if (!code || code.length < 6) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('local_tournaments')
        .select('*')
        .eq('private_code', code.toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({ title: 'Not Found', description: 'No tournament found with this code.', variant: 'destructive' });
        setTournament(null);
        return;
      }

      setTournament(data as LocalTournament);
      setHasJoined(data.joined_users?.includes(user?.id) || false);
    } catch (error) {
      console.error('Error searching tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !tournament) return;

    if (walletBalance < tournament.entry_fee) {
      toast({ title: 'Insufficient Balance', description: `You need ₹${tournament.entry_fee} to join.`, variant: 'destructive' });
      return;
    }

    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_local_tournament', {
        p_user_id: user.id,
        p_private_code: code.toUpperCase(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; entry_fee?: number };

      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }

      toast({ title: '🎮 Joined Successfully!', description: `Entry fee ₹${result.entry_fee} deducted.` });
      setHasJoined(true);
      fetchWalletBalance();
      searchTournament();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Join Local Tournament</h1>
            <p className="text-xs text-muted-foreground">Private school/college event</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {!code && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Scan a tournament QR code to join</p>
            </CardContent>
          </Card>
        )}

        {tournament && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{tournament.tournament_name}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3" />
                    {tournament.institution_name}
                  </p>
                </div>
                <Badge variant={tournament.status === 'ongoing' ? 'default' : 'outline'}
                  className={tournament.status === 'ongoing' ? 'bg-green-500' : ''}>
                  {tournament.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournament.status === 'upcoming' && (
                <LocalTournamentCountdown targetDate={new Date(tournament.tournament_date)} />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-primary" />
                  <span className="text-sm">{tournament.game}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm">{tournament.tournament_mode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm">{format(new Date(tournament.tournament_date), 'dd MMM, hh:mm a')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-green-600" />
                  <span className="text-sm">₹{tournament.current_prize_pool} Prize</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Entry Fee</span>
                <span className="font-bold text-lg">₹{tournament.entry_fee}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Players</span>
                <span className="font-medium">{tournament.joined_users?.length || 0} / {tournament.max_participants}</span>
              </div>

              {hasJoined && tournament.status === 'ongoing' && (tournament.room_id || tournament.room_password) && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" />
                      Room Details
                    </h4>
                    {tournament.room_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Room ID:</span>
                        <span className="font-mono font-bold">{tournament.room_id}</span>
                      </div>
                    )}
                    {tournament.room_password && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Password:</span>
                        <span className="font-mono font-bold">{tournament.room_password}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {hasJoined ? (
                <div className="flex items-center justify-center gap-2 text-green-600 bg-green-500/10 rounded-lg p-3">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">You've Joined This Tournament</span>
                </div>
              ) : tournament.status === 'upcoming' ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your Wallet Balance</span>
                    <span className={walletBalance < tournament.entry_fee ? 'text-destructive' : 'text-green-600'}>
                      ₹{walletBalance}
                    </span>
                  </div>
                  <Button onClick={handleJoin} disabled={joining || walletBalance < tournament.entry_fee || !user} className="w-full">
                    {joining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Gamepad2 className="h-4 w-4 mr-2" />}
                    {!user ? 'Login to Join' : walletBalance < tournament.entry_fee ? 'Insufficient Balance' : `Join Tournament (₹${tournament.entry_fee})`}
                  </Button>
                  {walletBalance < tournament.entry_fee && user && (
                    <Button variant="outline" className="w-full" onClick={() => navigate('/wallet')}>
                      Add Money to Wallet
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 text-muted-foreground bg-muted rounded-lg p-3">
                  <Lock className="h-5 w-5" />
                  <span>Registration Closed</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">Please login to join tournaments</p>
              <Button onClick={() => navigate('/auth')}>Login</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default JoinLocalTournamentPage;
