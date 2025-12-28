import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, ArrowLeft, Sparkles, Sword, Crown, Flame, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import anime avatars
import animeSamurai from '@/assets/avatars/anime-samurai.png';
import animeNinja from '@/assets/avatars/anime-ninja.png';
import animeSorcerer from '@/assets/avatars/anime-sorcerer.png';
import animeDragonslayer from '@/assets/avatars/anime-dragonslayer.png';
import animeCommander from '@/assets/avatars/anime-commander.png';
import animeFiremage from '@/assets/avatars/anime-firemage.png';
import animeIcequeen from '@/assets/avatars/anime-icequeen.png';
import animeAssassin from '@/assets/avatars/anime-assassin.png';
import animeWarrior from '@/assets/avatars/anime-warrior.png';
import animeDemonhunter from '@/assets/avatars/anime-demonhunter.png';
import animeLightningmage from '@/assets/avatars/anime-lightningmage.png';
import animeRogue from '@/assets/avatars/anime-rogue.png';
import animeAngel from '@/assets/avatars/anime-angel.png';
import animeVampire from '@/assets/avatars/anime-vampire.png';
import animeHacker from '@/assets/avatars/anime-hacker.png';
import animeKitsune from '@/assets/avatars/anime-kitsune.png';

// Import premium avatars
import championGold from '@/assets/avatars/unlockable/champion-gold.png';
import legendaryPhoenix from '@/assets/avatars/unlockable/legendary-phoenix.png';
import eliteDragon from '@/assets/avatars/unlockable/elite-dragon.png';
import masterTitan from '@/assets/avatars/unlockable/master-titan.png';
import starterWarrior from '@/assets/avatars/unlockable/starter-warrior.png';
import veteranSoldier from '@/assets/avatars/unlockable/veteran-soldier.png';
import dedicatedLegend from '@/assets/avatars/unlockable/dedicated-legend.png';
import goldChampion from '@/assets/avatars/unlockable/gold-champion.png';
import silverKnight from '@/assets/avatars/unlockable/silver-knight.png';
import localHero from '@/assets/avatars/unlockable/local-hero.png';

// Avatar categories
const avatarCategories = {
  warriors: {
    label: 'Warriors',
    icon: Sword,
    color: 'text-red-500',
    avatars: [
      { id: 'anime-samurai', src: animeSamurai, name: 'Dark Samurai' },
      { id: 'anime-warrior', src: animeWarrior, name: 'Blade Warrior' },
      { id: 'anime-dragonslayer', src: animeDragonslayer, name: 'Dragon Slayer' },
      { id: 'anime-demonhunter', src: animeDemonhunter, name: 'Demon Hunter' },
    ],
  },
  assassins: {
    label: 'Assassins',
    icon: Zap,
    color: 'text-purple-500',
    avatars: [
      { id: 'anime-ninja', src: animeNinja, name: 'Red Ninja' },
      { id: 'anime-assassin', src: animeAssassin, name: 'Skull Reaper' },
      { id: 'anime-rogue', src: animeRogue, name: 'Shadow Rogue' },
      { id: 'anime-vampire', src: animeVampire, name: 'Blood Lord' },
    ],
  },
  mages: {
    label: 'Mages',
    icon: Sparkles,
    color: 'text-blue-500',
    avatars: [
      { id: 'anime-sorcerer', src: animeSorcerer, name: 'Blue Sorcerer' },
      { id: 'anime-firemage', src: animeFiremage, name: 'Fire Mage' },
      { id: 'anime-icequeen', src: animeIcequeen, name: 'Ice Queen' },
      { id: 'anime-lightningmage', src: animeLightningmage, name: 'Storm Mage' },
    ],
  },
  legends: {
    label: 'Legends',
    icon: Crown,
    color: 'text-yellow-500',
    avatars: [
      { id: 'anime-angel', src: animeAngel, name: 'Divine Angel' },
      { id: 'anime-kitsune', src: animeKitsune, name: 'Spirit Fox' },
      { id: 'anime-commander', src: animeCommander, name: 'Cyber Commander' },
      { id: 'anime-hacker', src: animeHacker, name: 'Neon Hacker' },
    ],
  },
  premium: {
    label: 'Premium',
    icon: Star,
    color: 'text-orange-500',
    avatars: [
      { id: 'champion-gold', src: championGold, name: 'Gold Champion' },
      { id: 'legendary-phoenix', src: legendaryPhoenix, name: 'Phoenix Legend' },
      { id: 'elite-dragon', src: eliteDragon, name: 'Elite Dragon' },
      { id: 'master-titan', src: masterTitan, name: 'Master Titan' },
      { id: 'starter-warrior', src: starterWarrior, name: 'Starter Hero' },
      { id: 'veteran-soldier', src: veteranSoldier, name: 'Veteran Soldier' },
      { id: 'dedicated-legend', src: dedicatedLegend, name: 'Dedicated Legend' },
      { id: 'gold-champion', src: goldChampion, name: 'Gold Knight' },
      { id: 'silver-knight', src: silverKnight, name: 'Silver Knight' },
      { id: 'local-hero', src: localHero, name: 'Local Hero' },
    ],
  },
};

const AvatarSelection = () => {
  const [selecting, setSelecting] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch current avatar on mount
  useState(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setCurrentAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    };
    fetchProfile();
  });

  const handleAvatarSelect = useCallback(async (avatarId: string, avatarSrc: string) => {
    if (!user || selecting) return;

    setSelecting(avatarId);
    try {
      // Fetch the preset image and convert to blob
      const response = await fetch(avatarSrc);
      const blob = await response.blob();
      const filePath = `${user.id}/avatar.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithTimestamp })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCurrentAvatarUrl(urlWithTimestamp);
      toast({
        title: 'Avatar Updated!',
        description: 'Your profile picture has been changed.',
      });
    } catch (error) {
      console.error('Error setting avatar:', error);
      toast({
        title: 'Error',
        description: 'Could not set avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSelecting(null);
    }
  }, [user, selecting, toast]);

  const isCurrentAvatar = (src: string) => {
    if (!currentAvatarUrl) return false;
    const srcFileName = src.split('/').pop()?.split('?')[0] || '';
    return currentAvatarUrl.includes(srcFileName);
  };

  if (loading) {
    return (
      <AppLayout title="Choose Avatar">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Choose Avatar">
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Choose Your Avatar</h1>
              <p className="text-xs text-muted-foreground">Select a character that represents you</p>
            </div>
          </div>
        </div>

        {/* Current Avatar Preview */}
        <div className="px-4 py-6">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-primary/30 shadow-lg shadow-primary/20">
                <AvatarImage src={currentAvatarUrl || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Current Avatar</p>
          </div>
        </div>

        {/* Avatar Categories Tabs */}
        <div className="px-4 pb-8">
          <Tabs defaultValue="warriors" className="w-full">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1 mb-4">
              {Object.entries(avatarCategories).map(([key, category]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="flex-1 min-w-[80px] gap-1.5 text-xs data-[state=active]:bg-background"
                >
                  <category.icon className={cn("h-3.5 w-3.5", category.color)} />
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(avatarCategories).map(([key, category]) => (
              <TabsContent key={key} value={key} className="mt-0">
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-2">
                    <category.icon className={cn("h-5 w-5", category.color)} />
                    <h2 className="font-semibold">{category.label}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {category.avatars.length} avatars
                    </Badge>
                  </div>

                  {/* Avatar Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {category.avatars.map((avatar) => {
                      const isSelected = isCurrentAvatar(avatar.src);
                      const isSelecting = selecting === avatar.id;

                      return (
                        <button
                          key={avatar.id}
                          onClick={() => handleAvatarSelect(avatar.id, avatar.src)}
                          disabled={!!selecting}
                          className={cn(
                            "relative bg-card rounded-xl border-2 p-3 transition-all hover:scale-[1.02] active:scale-[0.98]",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            isSelected 
                              ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                              : "border-border hover:border-primary/50",
                            selecting && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="relative">
                              <Avatar className="h-20 w-20 border-2 border-border">
                                <AvatarImage src={avatar.src} className="object-cover" />
                                <AvatarFallback>{avatar.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              
                              {/* Selection indicator */}
                              {isSelected && !isSelecting && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                                </div>
                              )}

                              {/* Loading overlay */}
                              {isSelecting && (
                                <div className="absolute inset-0 rounded-full bg-background/80 flex items-center justify-center">
                                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                              )}
                            </div>
                            
                            <div className="text-center">
                              <p className="font-medium text-sm">{avatar.name}</p>
                              {isSelected && (
                                <Badge className="mt-1 text-[10px] bg-primary/10 text-primary border-0">
                                  Selected
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Footer */}
        <div className="px-4 pb-8">
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium">Express Your Identity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Choose an avatar that matches your gaming style and personality
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AvatarSelection;
