 import { useState, useRef } from 'react';
import { Check, CheckCheck, Reply, Trash2, Pencil, MoreVertical, Copy, X, Smile } from 'lucide-react';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
   DropdownMenuSeparator,
 } from '@/components/ui/dropdown-menu';
 import { format } from 'date-fns';
 import { cn } from '@/lib/utils';
 
 interface MessageBubbleProps {
   id: string;
   content: string;
   senderId: string;
   senderName: string;
   senderAvatar?: string;
   timestamp: string;
   isOwn: boolean;
   isEdited?: boolean;
   seenCount?: number;
   totalMembers?: number;
   replyTo?: {
     senderName: string;
     content: string;
   } | null;
   reactions?: Record<string, string[]>;
   canModify?: boolean;
   onReply: () => void;
   onEdit: () => void;
   onDelete: () => void;
   onReact?: (emoji: string) => void;
   isEditing?: boolean;
   editContent?: string;
   onEditChange?: (value: string) => void;
   onEditSave?: () => void;
   onEditCancel?: () => void;
 }
 
 const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
 
 const MessageBubble = ({
  id: _id,
   content,
  senderId: _senderId,
   senderName,
   senderAvatar,
   timestamp,
   isOwn,
   isEdited,
   seenCount = 0,
  totalMembers: _totalMembers = 0,
   replyTo,
   reactions = {},
   canModify,
   onReply,
   onEdit,
   onDelete,
   onReact,
   isEditing,
   editContent,
   onEditChange,
   onEditSave,
   onEditCancel,
 }: MessageBubbleProps) => {
   const [showReactions, setShowReactions] = useState(false);
   const longPressTimer = useRef<NodeJS.Timeout | null>(null);
 
   const handleLongPressStart = () => {
     longPressTimer.current = setTimeout(() => {
       setShowReactions(true);
     }, 500);
   };
 
   const handleLongPressEnd = () => {
     if (longPressTimer.current) {
       clearTimeout(longPressTimer.current);
     }
   };
 
   const getTickColor = () => {
     if (seenCount > 0) return 'text-blue-400';
     return 'text-muted-foreground/60';
   };
 
   const groupedReactions = Object.entries(reactions).filter(([_, users]) => users.length > 0);
 
   return (
     <div
       className={cn(
         "flex gap-2 group relative px-2 py-0.5",
         isOwn ? "flex-row-reverse" : ""
       )}
       onTouchStart={handleLongPressStart}
       onTouchEnd={handleLongPressEnd}
       onMouseDown={handleLongPressStart}
       onMouseUp={handleLongPressEnd}
       onMouseLeave={handleLongPressEnd}
     >
       {/* Avatar - only for others */}
       {!isOwn && (
         <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5 ring-2 ring-background shadow-md">
           <AvatarImage src={senderAvatar || ''} />
           <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary text-xs font-bold">
             {senderName.charAt(0).toUpperCase()}
           </AvatarFallback>
         </Avatar>
       )}
 
       <div className={cn("max-w-[78%] min-w-[60px]", isOwn ? "items-end" : "items-start")}>
         {/* Sender name for others */}
         {!isOwn && (
           <span className="text-[10px] font-semibold text-primary ml-1 mb-0.5 block">
             {senderName}
           </span>
         )}
 
         {/* Reply preview */}
         {replyTo && (
           <div 
             className={cn(
               "flex items-start gap-1.5 mb-1 ml-1",
               isOwn && "mr-1 ml-0"
             )}
           >
             <div className={cn(
               "w-0.5 h-8 rounded-full",
               isOwn ? "bg-primary-foreground/40" : "bg-primary/60"
             )} />
             <div className="text-[10px] leading-tight">
               <span className={cn(
                 "font-semibold block",
                 isOwn ? "text-primary-foreground/80" : "text-primary"
               )}>
                 {replyTo.senderName}
               </span>
               <span className="text-muted-foreground line-clamp-1">{replyTo.content}</span>
             </div>
           </div>
         )}
 
         {/* Message Bubble */}
         <div className="relative">
           {isEditing ? (
             <div className="flex items-center gap-1.5 bg-background border rounded-xl p-1">
               <Input
                 value={editContent}
                 onChange={(e) => onEditChange?.(e.target.value)}
                 className="flex-1 h-8 text-xs border-0 bg-transparent"
                 autoFocus
               />
               <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditSave}>
                 <Check className="h-4 w-4 text-green-500" />
               </Button>
               <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditCancel}>
                 <X className="h-4 w-4 text-destructive" />
               </Button>
             </div>
           ) : (
             <div
               className={cn(
                 "relative px-3 py-2 rounded-2xl shadow-sm",
                 isOwn
                   ? "bg-primary text-primary-foreground rounded-br-md"
                   : "bg-card border border-border/50 text-foreground rounded-bl-md"
               )}
             >
               {/* WhatsApp style tail */}
               <div 
                 className={cn(
                   "absolute top-0 w-3 h-3 overflow-hidden",
                   isOwn ? "-right-1.5" : "-left-1.5"
                 )}
               >
                 <div 
                   className={cn(
                     "w-4 h-4 transform rotate-45",
                     isOwn 
                       ? "bg-primary -translate-x-2 translate-y-0.5" 
                       : "bg-card border-l border-t border-border/50 translate-x-0.5 translate-y-0.5"
                   )}
                 />
               </div>
 
               {/* Message Content */}
               <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                 {content}
               </p>
 
               {/* Time & Status Row */}
               <div className={cn(
                 "flex items-center gap-1 mt-1 justify-end",
                 isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
               )}>
                 <span className="text-[10px]">
                   {format(new Date(timestamp), 'h:mm a')}
                 </span>
                 {isEdited && (
                   <span className="text-[9px] italic">edited</span>
                 )}
                 {isOwn && (
                   <span className={cn("flex items-center", getTickColor())}>
                     {seenCount > 0 ? (
                       <CheckCheck className="h-3.5 w-3.5" />
                     ) : (
                       <Check className="h-3 w-3" />
                     )}
                   </span>
                 )}
               </div>
             </div>
           )}
 
           {/* Reactions Display */}
           {groupedReactions.length > 0 && (
             <div className={cn(
               "flex flex-wrap gap-1 mt-1",
               isOwn ? "justify-end" : "justify-start"
             )}>
               {groupedReactions.map(([emoji, users]) => (
                 <button
                   key={emoji}
                   className="flex items-center gap-0.5 bg-muted/80 hover:bg-muted rounded-full px-1.5 py-0.5 text-xs"
                   onClick={() => onReact?.(emoji)}
                 >
                   <span>{emoji}</span>
                   {users.length > 1 && <span className="text-[10px]">{users.length}</span>}
                 </button>
               ))}
             </div>
           )}
 
           {/* Quick Reactions Bar - shown on long press */}
           {showReactions && (
             <div className={cn(
               "absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-card border rounded-full px-2 py-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200"
             )}>
               {QUICK_REACTIONS.map((emoji) => (
                 <button
                   key={emoji}
                   className="text-xl hover:scale-125 transition-transform p-1"
                   onClick={() => {
                     onReact?.(emoji);
                     setShowReactions(false);
                   }}
                 >
                   {emoji}
                 </button>
               ))}
               <Button
                 size="icon"
                 variant="ghost"
                 className="h-6 w-6 ml-1"
                 onClick={() => setShowReactions(false)}
               >
                 <X className="h-3 w-3" />
               </Button>
             </div>
           )}
         </div>
 
         {/* Hover Actions */}
         {!isEditing && (
           <div className={cn(
             "flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
             isOwn ? "justify-end" : "justify-start"
           )}>
             <Button
               size="icon"
               variant="ghost"
               className="h-6 w-6"
               onClick={onReply}
             >
               <Reply className="h-3.5 w-3.5" />
             </Button>
             <Button
               size="icon"
               variant="ghost"
               className="h-6 w-6"
               onClick={() => setShowReactions(true)}
             >
               <Smile className="h-3.5 w-3.5" />
             </Button>
             {canModify && (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button size="icon" variant="ghost" className="h-6 w-6">
                     <MoreVertical className="h-3.5 w-3.5" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-36">
                   <DropdownMenuItem onClick={() => navigator.clipboard.writeText(content)}>
                     <Copy className="h-3.5 w-3.5 mr-2" /> Copy
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={onEdit}>
                     <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={onDelete} className="text-destructive">
                     <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             )}
           </div>
         )}
       </div>
     </div>
   );
 };
 
 export default MessageBubble;