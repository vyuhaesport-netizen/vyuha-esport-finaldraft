import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ScrollText, Plus, Trash2, Edit2, Eye, Gamepad2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RuleItem {
  id: string;
  title: string;
  content: string;
  game: string;
  mode: string;
}

const RULES_SETTING_KEY = 'tournament_rules_config';
const GAMES = ['', 'BGMI', 'Free Fire'];
const MODES = ['', 'solo', 'duo', 'squad'];

const AdminRules = () => {
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; rule: RuleItem | null; index: number }>({ open: false, rule: null, index: -1 });
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; rule: RuleItem | null }>({ open: false, rule: null });
  const [filterGame, setFilterGame] = useState<string>('');
  const [filterMode, setFilterMode] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    game: '',
    mode: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', RULES_SETTING_KEY)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value);
          setRules(Array.isArray(parsed) ? parsed : []);
        } catch {
          setRules([]);
        }
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async (updatedRules: RuleItem[]) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('setting_key', RULES_SETTING_KEY)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('platform_settings')
          .update({ setting_value: JSON.stringify(updatedRules) })
          .eq('setting_key', RULES_SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            setting_key: RULES_SETTING_KEY,
            setting_value: JSON.stringify(updatedRules),
            description: 'Tournament rules configuration',
          });
        if (error) throw error;
      }

      setRules(updatedRules);
      toast({ title: 'Saved', description: 'Rules saved successfully.' });
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({ title: 'Error', description: 'Failed to save rules.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({ title: '', content: '', game: '', mode: '' });
    setEditDialog({ open: true, rule: null, index: -1 });
  };

  const handleOpenEdit = (rule: RuleItem, index: number) => {
    setFormData({
      title: rule.title,
      content: rule.content,
      game: rule.game || '',
      mode: rule.mode || '',
    });
    setEditDialog({ open: true, rule, index });
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: 'Error', description: 'Title and content are required.', variant: 'destructive' });
      return;
    }

    const newRule: RuleItem = {
      id: editDialog.rule?.id || crypto.randomUUID(),
      title: formData.title.trim(),
      content: formData.content.trim(),
      game: formData.game.trim(),
      mode: formData.mode.trim(),
    };

    let updatedRules: RuleItem[];
    if (editDialog.index >= 0) {
      updatedRules = [...rules];
      updatedRules[editDialog.index] = newRule;
    } else {
      updatedRules = [...rules, newRule];
    }

    await saveRules(updatedRules);
    setEditDialog({ open: false, rule: null, index: -1 });
  };

  const handleDelete = async (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    await saveRules(updatedRules);
  };

  const getFilteredRules = () => {
    return rules.filter(rule => {
      if (filterGame && rule.game && !rule.game.toLowerCase().includes(filterGame.toLowerCase())) {
        return false;
      }
      if (filterMode && rule.mode && rule.mode.toLowerCase() !== filterMode.toLowerCase()) {
        return false;
      }
      return true;
    });
  };

  return (
    <AdminLayout title="Tournament Rules">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold">Manage Rules</h2>
            <p className="text-sm text-muted-foreground">
              Create game and mode-specific tournament rules
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2" disabled={saving}>
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Filter:</span>
              </div>
              <Select value={filterGame || "all"} onValueChange={(v) => setFilterGame(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Games</SelectItem>
                  <SelectItem value="BGMI">🎮 BGMI</SelectItem>
                  <SelectItem value="Free Fire">🔥 Free Fire</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMode || "all"} onValueChange={(v) => setFilterMode(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="duo">Duo</SelectItem>
                  <SelectItem value="squad">Squad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : getFilteredRules().length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No rules found</p>
              <Button onClick={handleOpenCreate} variant="outline" className="mt-4">
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {getFilteredRules().map((rule, index) => (
              <Card key={rule.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <ScrollText className="h-4 w-4 text-primary" />
                        {rule.title}
                        {rule.game && (
                          <Badge variant="secondary" className="text-[9px]">
                            {rule.game === 'BGMI' ? '🎮' : '🔥'} {rule.game}
                          </Badge>
                        )}
                        {rule.mode && (
                          <Badge variant="outline" className="text-[9px] capitalize">
                            {rule.mode}
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setPreviewDialog({ open: true, rule })}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(rule, rules.indexOf(rule))}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(rules.indexOf(rule))}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {rule.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, rule: editDialog.rule, index: editDialog.index })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog.rule ? 'Edit Rule' : 'Create Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                placeholder="e.g., General Tournament Rules"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Game</Label>
                <Select value={formData.game || "all"} onValueChange={(v) => setFormData({ ...formData, game: v === "all" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Games" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Games</SelectItem>
                    <SelectItem value="BGMI">🎮 BGMI</SelectItem>
                    <SelectItem value="Free Fire">🔥 Free Fire</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty for all games
                </p>
              </div>
              <div>
                <Label>Mode</Label>
                <Select value={formData.mode || "all"} onValueChange={(v) => setFormData({ ...formData, mode: v === "all" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Modes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="duo">Duo</SelectItem>
                    <SelectItem value="squad">Squad</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave empty for all modes
                </p>
              </div>
            </div>
            <div>
              <Label>Rules Content *</Label>
              <Textarea
                placeholder="Write your tournament rules here...

Example:
• All players must join the room 5 minutes before match starts
• Teaming up with enemy players is strictly prohibited
• Hacking or using any third-party tools will result in permanent ban
• Winner must submit screenshot within 10 minutes"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, rule: null, index: -1 })}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editDialog.rule ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open, rule: previewDialog.rule })}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <ScrollText className="h-5 w-5" />
              {previewDialog.rule?.title}
              {previewDialog.rule?.game && (
                <Badge variant="secondary" className="text-[9px]">
                  {previewDialog.rule.game}
                </Badge>
              )}
              {previewDialog.rule?.mode && (
                <Badge variant="outline" className="text-[9px] capitalize">
                  {previewDialog.rule.mode}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm">
            {previewDialog.rule?.content}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminRules;
