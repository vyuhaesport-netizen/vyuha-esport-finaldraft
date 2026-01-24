import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  Save,
  ScrollText,
  Gamepad2,
  CheckCircle,
  FileText
} from 'lucide-react';

interface RuleConfig {
  use_platform_rules: boolean;
  custom_rules_content: string;
}

interface PlatformRule {
  id: string;
  title: string;
  content: string;
  game: string;
  mode?: string;
}

const GAMES = ['BGMI', 'Free Fire'];
const MODES = ['solo', 'duo', 'squad'];

const CreatorRules = () => {
  const [selectedGame, setSelectedGame] = useState<string>('BGMI');
  const [selectedMode, setSelectedMode] = useState<string>('solo');
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>({
    use_platform_rules: true,
    custom_rules_content: ''
  });
  const [platformRules, setPlatformRules] = useState<PlatformRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { user, isCreator, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (!isCreator) {
        navigate('/profile');
        toast({ title: 'Access Denied', description: 'You are not an approved creator.', variant: 'destructive' });
      }
    }
  }, [user, isCreator, authLoading, navigate, toast]);

  useEffect(() => {
    if (isCreator && user) {
      fetchData();
    }
  }, [isCreator, user, selectedGame, selectedMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch platform rules
      const { data: settingsData } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'tournament_rules_config')
        .single();

      if (settingsData?.setting_value) {
        try {
          const parsed = JSON.parse(settingsData.setting_value);
          setPlatformRules(Array.isArray(parsed) ? parsed : []);
        } catch {
          setPlatformRules([]);
        }
      }

      // Fetch creator's custom rules for this game/mode - using any since table may not exist
      const { data: customRules, error } = await supabase
        .from('creator_custom_rules' as any)
        .select('*')
        .eq('creator_id', user!.id)
        .eq('game', selectedGame)
        .eq('mode', selectedMode)
        .single() as any;

      if (!error && customRules) {
        setRuleConfig({
          use_platform_rules: customRules.use_platform_rules ?? true,
          custom_rules_content: customRules.custom_rules_content || ''
        });
      } else {
        setRuleConfig({
          use_platform_rules: true,
          custom_rules_content: ''
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('creator_custom_rules' as any)
        .upsert({
          creator_id: user.id,
          game: selectedGame,
          mode: selectedMode,
          use_platform_rules: ruleConfig.use_platform_rules,
          custom_rules_content: ruleConfig.custom_rules_content,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'creator_id,game,mode'
        } as any) as any;

      if (error) throw error;

      toast({ title: 'Saved!', description: 'Rules configuration saved successfully.' });
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({ title: 'Error', description: 'Failed to save rules. Make sure the database is set up.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getFilteredPlatformRules = () => {
    return platformRules.filter(rule => {
      const gameMatch = !rule.game || rule.game.toLowerCase() === selectedGame.toLowerCase();
      const modeMatch = !rule.mode || rule.mode.toLowerCase() === selectedMode.toLowerCase();
      return gameMatch && modeMatch;
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/creator')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Tournament Rules</h1>
            <p className="text-xs text-muted-foreground">Configure rules for your tournaments</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Game Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Select Game
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {GAMES.map(game => (
                <Button
                  key={game}
                  variant={selectedGame === game ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGame(game)}
                  className="flex-1"
                >
                  {game === 'BGMI' && '🎮'}
                  {game === 'Free Fire' && '🔥'}
                  <span className="ml-1">{game}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mode Selection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Select Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {MODES.map(mode => (
                <Button
                  key={mode}
                  variant={selectedMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMode(mode)}
                  className="flex-1 capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rules Type Toggle */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ScrollText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Use Platform Rules</p>
                  <p className="text-xs text-muted-foreground">
                    Use official platform rules for {selectedGame} {selectedMode}
                  </p>
                </div>
              </div>
              <Switch
                checked={ruleConfig.use_platform_rules}
                onCheckedChange={(checked) => setRuleConfig(prev => ({ ...prev, use_platform_rules: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Platform Rules Preview (when using platform rules) */}
        {ruleConfig.use_platform_rules && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Platform Rules Preview
                <Badge variant="secondary" className="text-[9px]">{selectedGame} • {selectedMode}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getFilteredPlatformRules().length > 0 ? (
                <div className="space-y-3">
                  {getFilteredPlatformRules().map(rule => (
                    <div key={rule.id} className="bg-muted/50 rounded-lg p-3">
                      <p className="font-medium text-sm mb-1">{rule.title}</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{rule.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No platform rules configured for this game/mode</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Custom Rules Editor (when not using platform rules) */}
        {!ruleConfig.use_platform_rules && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Custom Rules
                <Badge className="text-[9px]">{selectedGame} • {selectedMode}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Write your custom rules</Label>
                  <Textarea
                    placeholder={`Write custom rules for ${selectedGame} ${selectedMode} tournaments...

Example:
• All players must join room 5 minutes before match
• No teaming with enemies
• Screenshot required within 10 minutes after match
• Hacking = permanent ban`}
                    value={ruleConfig.custom_rules_content}
                    onChange={(e) => setRuleConfig(prev => ({ ...prev, custom_rules_content: e.target.value }))}
                    rows={12}
                    className="font-mono text-sm mt-1"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  These rules will be shown to players when they view your {selectedGame} {selectedMode} tournaments.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Rules Configuration
        </Button>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">How it works</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure rules for each game and mode separately. Players will see the appropriate rules 
                  based on the tournament they're joining. You can use platform rules or write your own custom rules.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorRules;
