import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  Gamepad2,
  ChevronDown,
  Copy,
  Check,
  Eye,
  Phone,
  Building2,
  Flag,
  Award,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

interface SchoolTournament {
  id: string;
  tournament_name: string;
  school_name: string;
  school_city: string;
  school_state?: string;
  school_district?: string;
  game: string;
  status: string;
  tournament_date: string;
  entry_fee: number;
  prize_pool: number;
  current_round: number;
  total_rounds?: number;
  private_code: string;
  max_players?: number;
  current_players?: number;
  first_place_prize?: number;
  second_place_prize?: number;
  third_place_prize?: number;
}

interface SchoolTeam {
  id: string;
  team_name: string;
  is_eliminated: boolean;
  current_round: number;
  final_rank?: number;
}

interface RoomAssignment {
  room_id: string;
  room_name: string;
  room_number: number;
  round_number: number;
  room_credentials_id?: string;
  room_credentials_pass?: string;
  scheduled_time?: string;
  status: string;
  slot_number: number;
}

interface Props {
  tournament: SchoolTournament;
  team: SchoolTeam;
  userId: string;
}

const SchoolTournamentPlayerCard = ({ tournament, team, userId }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [roomAssignment, setRoomAssignment] = useState<RoomAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomDetailsOpen, setRoomDetailsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [organizerPhone, setOrganizerPhone] = useState<string | null>(null);

  useEffect(() => {
    fetchRoomAssignment();
    fetchOrganizerContact();
  }, [team.id, team.current_round]);

  const fetchRoomAssignment = async () => {
    try {
      // Get current room assignment for the team
      const { data, error } = await supabase
        .from('school_tournament_room_assignments')
        .select(`
          slot_number,
          room_id,
          school_tournament_rooms!inner (
            id,
            room_name,
            room_number,
            round_number,
            room_id,
            room_password,
            scheduled_time,
            status
          )
        `)
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        const room = data.school_tournament_rooms as any;
        setRoomAssignment({
          room_id: room.id,
          room_name: room.room_name,
          room_number: room.room_number,
          round_number: room.round_number,
          room_credentials_id: room.room_id,
          room_credentials_pass: room.room_password,
          scheduled_time: room.scheduled_time,
          status: room.status,
          slot_number: data.slot_number
        });
      }
    } catch (error) {
      console.error('Error fetching room assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizerContact = async () => {
    try {
      const { data } = await supabase
        .from('school_tournament_applications')
        .select('primary_phone')
        .eq('id', (await supabase.from('school_tournaments').select('application_id').eq('id', tournament.id).single()).data?.application_id)
        .single();

      if (data?.primary_phone) {
        setOrganizerPhone(data.primary_phone);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: 'Copied!', description: `${field} copied to clipboard.` });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const getStatusConfig = () => {
    if (team.is_eliminated) {
      return {
        icon: XCircle,
        label: 'Eliminated',
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/20'
      };
    }
    
    if (team.final_rank === 1) {
      return {
        icon: Trophy,
        label: 'Champion! 🏆',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/20'
      };
    }

    if (tournament.status === 'completed') {
      return {
        icon: CheckCircle2,
        label: 'Tournament Completed',
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/50',
        borderColor: 'border-border'
      };
    }

    return {
      icon: Target,
      label: `Round ${team.current_round || 1} Active`,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20'
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const totalRounds = tournament.total_rounds || 3;

  return (
    <Card variant="premium" className="overflow-hidden">
      {/* Header with gradient */}
      <div className="relative p-4 bg-gradient-to-br from-primary/10 via-gaming-purple/5 to-transparent">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base line-clamp-1 mb-1">
              {tournament.tournament_name}
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span className="truncate">{tournament.school_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />
              <span>{tournament.school_city}{tournament.school_state ? `, ${tournament.school_state}` : ''}</span>
            </div>
          </div>
          
          <Badge 
            className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border text-xs font-medium`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Team Info Banner */}
        <div className="mt-3 p-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Your Team</p>
              <p className="font-semibold text-sm">{team.team_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current Round</p>
              <p className="font-bold text-lg text-primary">{team.current_round || 1}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="stat-card text-center p-3">
            <Gamepad2 className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xs font-medium">{tournament.game}</p>
          </div>
          <div className="stat-card text-center p-3">
            <Trophy className="h-4 w-4 text-warning mx-auto mb-1" />
            <p className="text-xs font-bold text-warning">₹{tournament.prize_pool || 0}</p>
          </div>
          <div className="stat-card text-center p-3">
            <Flag className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-medium">{totalRounds} Rounds</p>
          </div>
          <div className="stat-card text-center p-3">
            <Calendar className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs font-medium">{format(new Date(tournament.tournament_date), 'MMM dd')}</p>
          </div>
        </div>

        {/* Round Progress */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Round Progress</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalRounds }).map((_, i) => {
              const roundNum = i + 1;
              const isPast = roundNum < (team.current_round || 1);
              const isCurrent = roundNum === (team.current_round || 1);
              const isEliminated = team.is_eliminated && roundNum >= (team.current_round || 1);
              
              return (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    isEliminated 
                      ? 'bg-destructive/50' 
                      : isPast 
                        ? 'bg-success' 
                        : isCurrent 
                          ? 'bg-primary animate-pulse' 
                          : 'bg-muted'
                  }`}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {team.is_eliminated 
              ? `Eliminated at Round ${team.current_round || 1}` 
              : `${totalRounds - (team.current_round || 1)} rounds remaining`
            }
          </p>
        </div>

        {/* Prize Distribution */}
        {(tournament.first_place_prize || tournament.second_place_prize || tournament.third_place_prize) && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-warning/10 to-gaming-orange/5 border border-warning/20">
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-warning" />
              Prize Distribution
            </p>
            <div className="flex items-center justify-around text-center">
              <div>
                <p className="text-lg font-bold text-warning">₹{tournament.first_place_prize || 0}</p>
                <p className="text-[10px] text-muted-foreground">1st Place</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-lg font-bold text-muted-foreground">₹{tournament.second_place_prize || 0}</p>
                <p className="text-[10px] text-muted-foreground">2nd Place</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-lg font-bold text-muted-foreground">₹{tournament.third_place_prize || 0}</p>
                <p className="text-[10px] text-muted-foreground">3rd Place</p>
              </div>
            </div>
          </div>
        )}

        {/* Room Details */}
        {roomAssignment && !team.is_eliminated && (
          <Collapsible open={roomDetailsOpen} onOpenChange={setRoomDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between rounded-xl h-11"
              >
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="font-medium">Room Details - Round {roomAssignment.round_number}</span>
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${roomDetailsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Room</span>
                  <span className="font-medium">{roomAssignment.room_name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Your Slot</span>
                  <Badge variant="outline">Slot #{roomAssignment.slot_number}</Badge>
                </div>
                {roomAssignment.scheduled_time && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Time
                    </span>
                    <span className="font-medium">{format(new Date(roomAssignment.scheduled_time), 'hh:mm a')}</span>
                  </div>
                )}
                {roomAssignment.room_credentials_id && (
                  <div className="p-3 bg-card rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Room ID</p>
                        <p className="font-mono font-medium">{roomAssignment.room_credentials_id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(roomAssignment.room_credentials_id!, 'Room ID')}
                      >
                        {copiedField === 'Room ID' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    {roomAssignment.room_credentials_pass && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Password</p>
                          <p className="font-mono font-medium">{roomAssignment.room_credentials_pass}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(roomAssignment.room_credentials_pass!, 'Password')}
                        >
                          {copiedField === 'Password' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Organizer Contact */}
        {organizerPhone && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Organizer:</span>
              <span className="font-medium">{organizerPhone}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(organizerPhone, 'Phone')}
            >
              {copiedField === 'Phone' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Action Button */}
        <Button 
          className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-gaming-purple hover:opacity-90"
          onClick={() => navigate(`/join-school-tournament/${tournament.private_code}`)}
        >
          View Full Details
        </Button>
      </div>
    </Card>
  );
};

export default SchoolTournamentPlayerCard;