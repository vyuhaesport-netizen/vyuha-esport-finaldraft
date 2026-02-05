import { useState, useRef, useEffect } from 'react';
import { Send, Smile, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ReplyingTo {
  id: string;
  senderName: string;
  content: string;
}

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onTyping?: () => void;
  replyingTo?: ReplyingTo | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛'],
  'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐', '🤲', '🤞', '✌️', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
  'Gaming': ['🎮', '🎯', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⚽', '🏀', '🔥', '💯', '✨', '🌟', '⭐', '🎲', '🃏', '🎭', '🎪', '🎢'],
};

const ChatComposer = ({
  value,
  onChange,
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled,
  placeholder = "Message...",
}: ChatComposerProps) => {
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasContent = value.trim().length > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (hasContent) {
        onSend();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    onTyping?.();
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(value + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-border">
          <div className="w-1 h-8 rounded-full bg-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary truncate">
              {replyingTo.senderName}
            </p>
            <p className="text-xs text-foreground/70 truncate">
              {replyingTo.content}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message Input Row */}
      <div className="flex items-center gap-2 p-2">
        {/* Emoji Picker */}
        <Popover open={showEmojis} onOpenChange={setShowEmojis}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-72 p-2 bg-card border-border" 
            align="start"
            side="top"
            sideOffset={8}
          >
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                <div key={category}>
                  <h4 className="text-[10px] font-bold text-foreground/50 uppercase mb-1">
                    {category}
                  </h4>
                  <div className="grid grid-cols-8 gap-0.5">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        className="text-lg hover:bg-primary/20 rounded p-1 transition-colors"
                        onClick={() => handleEmojiSelect(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text Input */}
        <Input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 h-10 rounded-full bg-muted border-border text-sm"
        />

        {/* Send Button */}
        <Button
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full shrink-0",
            hasContent ? "bg-primary" : "bg-muted"
          )}
          onClick={onSend}
          disabled={disabled || !hasContent}
        >
          <Send className={cn("h-5 w-5", hasContent ? "" : "text-muted-foreground")} />
        </Button>
      </div>
    </div>
  );
};

export default ChatComposer;