import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, Trophy, Swords, Wallet, Gift, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  initOneSignal, 
  loginOneSignal, 
  requestPushPermission, 
  getPushPermissionStatus 
} from '@/lib/onesignal';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PROMPT_DISMISSED_KEY = 'push_notification_prompt_dismissed';
const PROMPT_DISMISS_EXPIRY_DAYS = 7;

export const PushNotificationPrompt: React.FC = () => {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkAndShowPrompt = useCallback(async () => {
    if (!user) return;
    
    // Check if user previously dismissed the prompt
    const dismissedData = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissedData) {
      try {
        const { timestamp } = JSON.parse(dismissedData);
        const daysSinceDismiss = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceDismiss < PROMPT_DISMISS_EXPIRY_DAYS) {
          return; // Don't show if dismissed within expiry period
        }
      } catch {
        // Invalid data, continue showing prompt
      }
    }
    
    // Initialize OneSignal
    await initOneSignal();
    
    // Wait a bit for OneSignal to fully load
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsInitialized(true);
    
    // Check current permission status
    const status = getPushPermissionStatus();
    
    // If permission already granted or denied permanently, don't show
    if (status === 'granted' || status === 'denied') {
      return;
    }
    
    // Show popup after small delay
    setTimeout(() => setShowPrompt(true), 2000);
    
    // Link user to OneSignal
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle();
    
    await loginOneSignal(user.id, profile?.email);
  }, [user]);

  useEffect(() => {
    checkAndShowPrompt();
  }, [checkAndShowPrompt]);

  const handleEnable = async () => {
    setIsLoading(true);
    
    try {
      const granted = await requestPushPermission();
      setShowPrompt(false);
      
      // Clear dismiss data on success
      localStorage.removeItem(PROMPT_DISMISSED_KEY);
      
      if (granted) {
        toast.success('Notifications enabled', {
          description: 'You will receive tournament and prize alerts.',
        });
      }
    } catch (error) {
      console.error('Error enabling push:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Store dismiss with timestamp
    localStorage.setItem(PROMPT_DISMISSED_KEY, JSON.stringify({
      timestamp: Date.now()
    }));
    setShowPrompt(false);
  };

  // Don't render if not initialized, no user, or prompt shouldn't show
  if (!isInitialized || !showPrompt || !user) return null;

  const notificationFeatures = [
    { icon: Trophy, text: 'Tournament announcements' },
    { icon: Swords, text: 'Match start reminders' },
    { icon: Wallet, text: 'Prize and withdrawal updates' },
    { icon: Gift, text: 'Special offers and rewards' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-foreground font-bold text-base">Stay in the Game</h3>
                <p className="text-muted-foreground text-xs">Never miss a tournament</p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Get instant alerts for:
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {notificationFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                <feature.icon className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs text-foreground font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1 h-11 text-sm"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleEnable}
              disabled={isLoading}
              className="flex-1 h-11 text-sm bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Alerts
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
