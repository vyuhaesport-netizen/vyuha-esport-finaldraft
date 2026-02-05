 import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Mic, X, Image, Camera, FileText } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Textarea } from '@/components/ui/textarea';
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
   'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑'],
   'Gestures': ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤝', '👏', '🙌', '👐', '🤲', '🤞', '✌️', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️'],
   'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
   'Objects': ['🎮', '🎯', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🔥', '💯', '✨', '🌟', '⭐'],
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
   const [isRecording, setIsRecording] = useState(false);
   const [recordingTime, setRecordingTime] = useState(0);
   const [showEmojis, setShowEmojis] = useState(false);
   const textareaRef = useRef<HTMLTextAreaElement>(null);
   const recordingInterval = useRef<NodeJS.Timeout | null>(null);
 
   const hasContent = value.trim().length > 0;
 
   useEffect(() => {
     if (textareaRef.current) {
       textareaRef.current.style.height = 'auto';
       textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
     }
   }, [value]);
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && !e.shiftKey) {
       e.preventDefault();
       if (hasContent) {
         onSend();
       }
     }
   };
 
   const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     onChange(e.target.value);
     onTyping?.();
   };
 
   const handleEmojiSelect = (emoji: string) => {
     onChange(value + emoji);
     textareaRef.current?.focus();
   };
 
   const startRecording = () => {
     setIsRecording(true);
     setRecordingTime(0);
     recordingInterval.current = setInterval(() => {
       setRecordingTime(t => t + 1);
     }, 1000);
   };
 
   const stopRecording = () => {
     setIsRecording(false);
     if (recordingInterval.current) {
       clearInterval(recordingInterval.current);
     }
     // Voice note would be sent here
   };
 
   const formatTime = (seconds: number) => {
     const mins = Math.floor(seconds / 60);
     const secs = seconds % 60;
     return `${mins}:${secs.toString().padStart(2, '0')}`;
   };
 
   return (
     <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 z-50">
       {/* Reply Preview */}
       {replyingTo && (
         <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border/30">
           <div className="w-1 h-10 rounded-full bg-primary" />
           <div className="flex-1 min-w-0">
             <p className="text-xs font-semibold text-primary truncate">
               Replying to {replyingTo.senderName}
             </p>
             <p className="text-xs text-muted-foreground truncate">
               {replyingTo.content}
             </p>
           </div>
           <Button
             size="icon"
             variant="ghost"
             className="h-8 w-8 shrink-0"
             onClick={onCancelReply}
           >
             <X className="h-4 w-4" />
           </Button>
         </div>
       )}
 
       {/* Recording UI */}
       {isRecording ? (
         <div className="flex items-center gap-3 px-4 py-3">
           <div className="flex items-center gap-2 flex-1">
             <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
             <span className="text-sm font-medium text-red-500">Recording...</span>
             <span className="text-sm text-muted-foreground">{formatTime(recordingTime)}</span>
           </div>
           <Button
             size="icon"
             variant="ghost"
             className="h-10 w-10"
             onClick={() => {
               setIsRecording(false);
               if (recordingInterval.current) clearInterval(recordingInterval.current);
             }}
           >
             <X className="h-5 w-5 text-destructive" />
           </Button>
           <Button
             size="icon"
             className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90"
             onClick={stopRecording}
           >
             <Send className="h-5 w-5" />
           </Button>
         </div>
       ) : (
         <div className="flex items-end gap-2 px-3 py-2">
           {/* Emoji Picker */}
           <Popover open={showEmojis} onOpenChange={setShowEmojis}>
             <PopoverTrigger asChild>
               <Button
                 size="icon"
                 variant="ghost"
                 className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
               >
                 <Smile className="h-5 w-5" />
               </Button>
             </PopoverTrigger>
             <PopoverContent 
               className="w-72 p-2" 
               align="start"
               side="top"
               sideOffset={8}
             >
               <div className="space-y-2 max-h-64 overflow-y-auto">
                 {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                   <div key={category}>
                     <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                       {category}
                     </h4>
                     <div className="grid grid-cols-8 gap-0.5">
                       {emojis.map((emoji) => (
                         <button
                           key={emoji}
                           className="text-xl hover:bg-muted rounded p-1 transition-colors"
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
 
           {/* Attachment Button */}
           <Popover>
             <PopoverTrigger asChild>
               <Button
                 size="icon"
                 variant="ghost"
                 className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
               >
                 <Paperclip className="h-5 w-5" />
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-48 p-2" align="start" side="top" sideOffset={8}>
               <div className="space-y-1">
                 <Button variant="ghost" className="w-full justify-start gap-2 h-10">
                   <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                     <FileText className="h-4 w-4 text-purple-500" />
                   </div>
                   Document
                 </Button>
                 <Button variant="ghost" className="w-full justify-start gap-2 h-10">
                   <div className="h-8 w-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                     <Image className="h-4 w-4 text-pink-500" />
                   </div>
                   Gallery
                 </Button>
                 <Button variant="ghost" className="w-full justify-start gap-2 h-10">
                   <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center">
                     <Camera className="h-4 w-4 text-red-500" />
                   </div>
                   Camera
                 </Button>
               </div>
             </PopoverContent>
           </Popover>
 
           {/* Text Input */}
           <div className="flex-1 relative">
             <Textarea
               ref={textareaRef}
               value={value}
               onChange={handleChange}
               onKeyDown={handleKeyDown}
               placeholder={placeholder}
               disabled={disabled}
               rows={1}
               className={cn(
                 "min-h-[44px] max-h-[120px] py-3 px-4 resize-none rounded-2xl",
                 "bg-muted/50 border-border/50 focus-visible:ring-primary/30",
                 "text-sm placeholder:text-muted-foreground/60"
               )}
             />
           </div>
 
           {/* Send / Mic Button */}
           {hasContent ? (
             <Button
               size="icon"
               className="h-11 w-11 rounded-full shrink-0 shadow-lg shadow-primary/20"
               onClick={onSend}
               disabled={disabled}
             >
               <Send className="h-5 w-5" />
             </Button>
           ) : (
             <Button
               size="icon"
               variant="ghost"
               className="h-11 w-11 rounded-full shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
               onClick={startRecording}
             >
               <Mic className="h-5 w-5" />
             </Button>
           )}
         </div>
       )}
     </div>
   );
 };
 
 export default ChatComposer;