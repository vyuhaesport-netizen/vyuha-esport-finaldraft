import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Loader2, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  FileText, 
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Eye,
  Users,
  Crown,
  Megaphone,
  Play,
  Link,
  Upload,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import vyuhaLogo from '@/assets/vyuha-logo.png';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  broadcast_type: string;
  target_audience: string;
  media_url?: string;
  media_type?: string;
  scheduled_for?: string;
  is_published: boolean;
  banner_url?: string;
  video_link?: string;
  attachment_url?: string;
  attachment_name?: string;
  created_at: string;
}

const AdminMessages = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [scheduledBroadcasts, setScheduledBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState('12:00');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    message: '',
    target_audience: 'all',
    media_type: 'text',
    video_link: '',
    banner_url: '',
    media_url: '',
    attachment_url: '',
    attachment_name: ''
  });

  const { user, hasPermission, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPermission('notifications:view') && !isSuperAdmin) {
      navigate('/admin');
      return;
    }
    fetchBroadcasts();
  }, [hasPermission, isSuperAdmin, navigate]);

  const fetchBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_broadcasts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);

      // Fetch scheduled broadcasts
      const { data: scheduled } = await supabase
        .from('admin_broadcasts')
        .select('*')
        .eq('is_published', false)
        .not('scheduled_for', 'is', null)
        .order('scheduled_for', { ascending: true });

      setScheduledBroadcasts(scheduled || []);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'audio' | 'image' | 'banner' | 'pdf') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `broadcast-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      if (type === 'banner') {
        setForm(prev => ({ ...prev, banner_url: publicUrl, media_type: 'banner' }));
      } else if (type === 'audio') {
        setForm(prev => ({ ...prev, media_url: publicUrl, media_type: 'audio' }));
      } else if (type === 'image') {
        setForm(prev => ({ ...prev, media_url: publicUrl, media_type: 'image' }));
      } else if (type === 'pdf') {
        setForm(prev => ({ 
          ...prev, 
          attachment_url: publicUrl, 
          attachment_name: file.name,
          media_type: 'pdf' 
        }));
      }

      toast({ title: 'Uploaded!', description: `${type} uploaded successfully.` });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({ title: 'Error', description: 'Failed to upload file.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleFileUpload(new File([audioBlob], `voice-${Date.now()}.webm`), 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({ title: 'Error', description: 'Could not access microphone.', variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleSend = async (isScheduled: boolean = false) => {
    if (!form.title.trim() || !form.message.trim()) {
      toast({ title: 'Error', description: 'Please fill in title and message.', variant: 'destructive' });
      return;
    }

    if (isScheduled && !scheduleDate) {
      toast({ title: 'Error', description: 'Please select a schedule date.', variant: 'destructive' });
      return;
    }

    setSending(true);

    try {
      let scheduledFor = null;
      if (isScheduled && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(':');
        const scheduledDate = new Date(scheduleDate);
        scheduledDate.setHours(parseInt(hours), parseInt(minutes));
        scheduledFor = scheduledDate.toISOString();
      }

      // Create broadcast record
      const { error: broadcastError } = await supabase
        .from('admin_broadcasts')
        .insert({
          admin_id: user?.id,
          title: form.title,
          message: form.message,
          broadcast_type: 'message',
          target_audience: form.target_audience,
          media_type: form.media_type,
          media_url: form.media_url || null,
          banner_url: form.banner_url || null,
          video_link: form.video_link || null,
          attachment_url: form.attachment_url || null,
          attachment_name: form.attachment_name || null,
          scheduled_for: scheduledFor,
          is_published: !isScheduled
        });

      if (broadcastError) throw broadcastError;

      // If not scheduled, send notifications immediately
      if (!isScheduled) {
        let targetUsers: string[] = [];
        
        if (form.target_audience === 'organizers') {
          const { data: organizerRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'organizer');
          targetUsers = organizerRoles?.map(r => r.user_id) || [];
        } else if (form.target_audience === 'creators') {
          const { data: creatorRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'creator');
          targetUsers = creatorRoles?.map(r => r.user_id) || [];
        } else {
          const { data: allUsers } = await supabase
            .from('profiles')
            .select('user_id');
          targetUsers = allUsers?.map(u => u.user_id) || [];
        }

        if (targetUsers.length > 0) {
          const notifications = targetUsers.map(userId => ({
            user_id: userId,
            type: 'broadcast',
            title: form.title,
            message: form.message
          }));

          await supabase.from('notifications').insert(notifications);
        }

        toast({ 
          title: 'Broadcast Sent!', 
          description: `Message sent to ${targetUsers.length} ${form.target_audience} users.` 
        });
      } else {
        toast({ 
          title: 'Scheduled!', 
          description: `Broadcast scheduled for ${format(scheduleDate!, 'MMM dd, yyyy')} at ${scheduleTime}` 
        });
      }

      // Reset form
      setForm({
        title: '',
        message: '',
        target_audience: 'all',
        media_type: 'text',
        video_link: '',
        banner_url: '',
        media_url: '',
        attachment_url: '',
        attachment_name: ''
      });
      setScheduleDate(undefined);
      fetchBroadcasts();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({ title: 'Error', description: 'Failed to send broadcast.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    try {
      await supabase.from('admin_broadcasts').delete().eq('id', id);
      toast({ title: 'Deleted', description: 'Broadcast deleted.' });
      fetchBroadcasts();
    } catch (error) {
      console.error('Error deleting broadcast:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const clearMedia = (type: string) => {
    if (type === 'banner') {
      setForm(prev => ({ ...prev, banner_url: '', media_type: 'text' }));
    } else if (type === 'media') {
      setForm(prev => ({ ...prev, media_url: '', media_type: 'text' }));
    } else if (type === 'video') {
      setForm(prev => ({ ...prev, video_link: '', media_type: 'text' }));
    } else if (type === 'pdf') {
      setForm(prev => ({ ...prev, attachment_url: '', attachment_name: '', media_type: 'text' }));
    }
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'organizers': return <Crown className="h-3 w-3" />;
      case 'creators': return <Users className="h-3 w-3" />;
      default: return <Megaphone className="h-3 w-3" />;
    }
  };

  return (
    <AdminLayout title="Broadcast Channel">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-primary/20 to-primary/5 p-4 rounded-xl border border-primary/20">
          <img src={vyuhaLogo} alt="Vyuha" className="w-12 h-12 rounded-full ring-2 ring-primary" />
          <div className="flex-1">
            <h2 className="font-bold text-lg">Vyuha Broadcast Channel</h2>
            <p className="text-xs text-muted-foreground">Send messages to Users, Creators & Organizers</p>
          </div>
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            Admin Access
          </Badge>
        </div>

        <Tabs defaultValue="compose" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="sent">Sent ({broadcasts.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({scheduledBroadcasts.length})</TabsTrigger>
          </TabsList>

          {/* Compose Tab */}
          <TabsContent value="compose" className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              {/* Target Audience */}
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={form.target_audience} onValueChange={(v) => setForm({ ...form, target_audience: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        All Users
                      </div>
                    </SelectItem>
                    <SelectItem value="organizers">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        Organizers Only
                      </div>
                    </SelectItem>
                    <SelectItem value="creators">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        Creators Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Broadcast title..."
                />
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Write your broadcast message..."
                  rows={4}
                />
              </div>

              {/* Media Options */}
              <div className="space-y-3">
                <Label>Add Media (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {/* Banner Upload */}
                  <input
                    type="file"
                    ref={bannerInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'banner');
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Banner
                  </Button>

                  {/* Video Link */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        <Video className="h-4 w-4 mr-1" />
                        Video Link
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-2">
                        <Label>YouTube/Video URL</Label>
                        <Input
                          value={form.video_link}
                          onChange={(e) => setForm({ ...form, video_link: e.target.value, media_type: 'video' })}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Audio Recording */}
                  {isRecording ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={stopRecording}
                    >
                      <Mic className="h-4 w-4 mr-1 animate-pulse" />
                      Stop {formatTime(recordingTime)}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={startRecording}
                      disabled={uploading}
                    >
                      <Mic className="h-4 w-4 mr-1" />
                      Audio
                    </Button>
                  )}

                  {/* PDF Upload */}
                  <input
                    type="file"
                    ref={pdfInputRef}
                    className="hidden"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'pdf');
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>

                {/* Media Previews */}
                {form.banner_url && (
                  <div className="relative">
                    <img src={form.banner_url} alt="Banner" className="w-full h-32 object-cover rounded-lg" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => clearMedia('banner')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {form.video_link && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Video className="h-4 w-4 text-red-500" />
                    <span className="text-sm truncate flex-1">{form.video_link}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => clearMedia('video')}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {form.media_url && form.media_type === 'audio' && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Mic className="h-4 w-4 text-primary" />
                    <span className="text-sm">Voice message attached</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => clearMedia('media')}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {form.attachment_url && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <span className="text-sm truncate flex-1">{form.attachment_name}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => clearMedia('pdf')}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Schedule Option */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <Label>Schedule for Later (Optional)</Label>
                </div>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {scheduleDate ? format(scheduleDate, 'MMM dd, yyyy') : 'Select Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => handleSend(false)} 
                  disabled={sending || uploading} 
                  className="flex-1"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Now
                </Button>
                {scheduleDate && (
                  <Button 
                    onClick={() => handleSend(true)} 
                    disabled={sending || uploading} 
                    variant="secondary"
                    className="flex-1"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Sent Broadcasts Tab */}
          <TabsContent value="sent">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No broadcasts sent yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {broadcasts.map((broadcast) => (
                    <div key={broadcast.id} className="bg-card border border-border rounded-xl p-4">
                      {broadcast.banner_url && (
                        <img 
                          src={broadcast.banner_url} 
                          alt="" 
                          className="w-full h-32 object-cover rounded-lg mb-3" 
                        />
                      )}
                      <div className="flex items-start gap-3">
                        <img src={vyuhaLogo} alt="Vyuha" className="w-10 h-10 rounded-full" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold">{broadcast.title}</h4>
                            <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                              {getAudienceIcon(broadcast.target_audience)}
                              {broadcast.target_audience}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{broadcast.message}</p>
                          
                          {broadcast.video_link && (
                            <a 
                              href={broadcast.video_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 mt-2 text-sm text-primary hover:underline"
                            >
                              <Play className="h-4 w-4" />
                              Watch Video
                            </a>
                          )}
                          
                          {broadcast.media_url && broadcast.media_type === 'audio' && (
                            <audio controls className="mt-2 w-full h-8">
                              <source src={broadcast.media_url} type="audio/webm" />
                            </audio>
                          )}
                          
                          {broadcast.attachment_url && (
                            <a 
                              href={broadcast.attachment_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 mt-2 text-sm text-orange-500 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {broadcast.attachment_name || 'Download PDF'}
                            </a>
                          )}
                          
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {format(new Date(broadcast.created_at), 'MMM dd, yyyy hh:mm a')}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteBroadcast(broadcast.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Scheduled Broadcasts Tab */}
          <TabsContent value="scheduled">
            {scheduledBroadcasts.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">No scheduled broadcasts</p>
                <p className="text-xs text-muted-foreground mt-1">Schedule messages for new users, creators & organizers</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {scheduledBroadcasts.map((broadcast) => (
                    <div key={broadcast.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{broadcast.title}</h4>
                            <Badge variant="secondary" className="text-[10px]">
                              {broadcast.target_audience}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{broadcast.message}</p>
                          <p className="text-xs text-primary mt-2">
                            <CalendarIcon className="h-3 w-3 inline mr-1" />
                            Scheduled for: {format(new Date(broadcast.scheduled_for!), 'MMM dd, yyyy hh:mm a')}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteBroadcast(broadcast.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;