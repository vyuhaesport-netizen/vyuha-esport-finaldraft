import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Trophy, 
  Users, 
  ChevronRight,
  Loader2,
  Bell,
  Zap,
  Star
} from 'lucide-react';
import { format } from 'date-fns';

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
}

const HomePage = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, title, game, prize_pool, entry_fee, start_date, status, max_participants, tournament_type')
        .eq('status', 'upcoming')
        .eq('tournament_type', 'organizer')
        .order('start_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10" />
          <div>
            <h1 className="font-gaming text-lg font-bold">Vyuha Esport</h1>
            <p className="text-xs text-muted-foreground">Welcome, {user?.email?.split('@')[0]}</p>
          </div>
        </div>
        <button className="relative p-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>

      {/* Stylish Banner */}
      <div className="p-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-orange-500 to-yellow-500 p-6 text-primary-foreground">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 border-4 border-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-48 h-48 border-4 border-white rounded-full translate-x-1/4 translate-y-1/4" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 border-2 border-white rounded-full" />
          </div>
          
          {/* Floating Icons */}
          <div className="absolute top-4 right-4">
            <div className="flex gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <Star className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse delay-100">
                <Zap className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6" />
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">OFFICIAL</span>
            </div>
            <h2 className="font-gaming text-2xl font-bold mb-2">Official Tournaments</h2>
            <p className="text-sm opacity-90 mb-4 max-w-[200px]">
              Join official Vyuha tournaments with amazing prizes!
            </p>
            <Button 
              size="sm" 
              className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
            >
              <Trophy className="mr-2 h-4 w-4" />
              View Tournaments
            </Button>
          </div>
        </div>
      </div>

      {/* Creator Section Banner */}
      <div className="px-4 mb-4">
        <button 
          onClick={() => navigate('/creator')}
          className="w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center gap-3 hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm">Creator Tournaments</p>
            <p className="text-xs text-muted-foreground">Join community-created matches</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Upcoming Official Tournaments */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-gaming font-semibold">Official Matches</h2>
          <button 
            className="text-primary text-sm flex items-center"
          >
            View All <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <Trophy className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">No official tournaments yet</p>
            <p className="text-xs text-muted-foreground mt-1">Check back soon for exciting matches!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm line-clamp-1">{tournament.title}</h3>
                    <p className="text-xs text-muted-foreground">{tournament.game}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary text-[10px]">
                    Official
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-primary" />
                      {tournament.prize_pool || 'TBD'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {tournament.max_participants}
                    </span>
                  </div>
                  <span>{format(new Date(tournament.start_date), 'MMM dd, hh:mm a')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default HomePage;