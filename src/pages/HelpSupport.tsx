import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const HelpSupport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [requestCallback, setRequestCallback] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const topics = [
    { value: 'payment', label: 'Payment Issue' },
    { value: 'tournament', label: 'Tournament Bug' },
    { value: 'account', label: 'Account Problem' },
    { value: 'organizer', label: 'Organizer Report' },
    { value: 'other', label: 'Other' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        if (file.size <= 10 * 1024 * 1024) {
          validFiles.push(file);
        } else {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds 10MB limit`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Only images and videos are allowed',
          variant: 'destructive',
        });
      }
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to submit a support request',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!topic) {
      toast({
        title: 'Select a topic',
        description: 'Please select the topic of your issue',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Describe your issue',
        description: 'Please provide details about your problem',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Upload attachments if any
      const attachmentUrls: string[] = [];
      for (const file of attachments) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(uploadData.path);

        attachmentUrls.push(urlData.publicUrl);
      }

      // Insert support ticket
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          topic,
          description: description.trim(),
          request_callback: requestCallback,
          attachments: attachmentUrls,
        });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: requestCallback 
          ? 'Our team will contact you soon on your registered number.'
          : "We'll get back to you via email within 24 hours.",
      });

      navigate('/profile');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit support request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Support Center</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Topic Dropdown */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Topic of Issue</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="w-full bg-card border-border">
              <SelectValue placeholder="Select a topic" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {topics.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Describe Your Problem</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please explain your issue in detail..."
            className="min-h-[120px] bg-card border-border resize-none"
          />
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Attachments (Proof)</Label>
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Paperclip className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Attach Screenshot or Video</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or MP4 (max 10MB)</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
            />
          </label>

          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {attachments.map((file, index) => (
                <div 
                  key={index}
                  className="relative group bg-muted rounded-lg px-3 py-2 flex items-center gap-2"
                >
                  <span className="text-xs text-foreground truncate max-w-[120px]">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="p-0.5 hover:bg-destructive/20 rounded-full transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Callback Toggle */}
        <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-foreground">Request a Call Back?</Label>
            <p className="text-xs text-muted-foreground">
              Our team will call your registered number if urgent.
            </p>
          </div>
          <Switch
            checked={requestCallback}
            onCheckedChange={setRequestCallback}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
        >
          {submitting ? (
            'Submitting...'
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Request
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default HelpSupport;
