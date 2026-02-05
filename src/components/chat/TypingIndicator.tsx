 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 
 interface TypingUser {
   id: string;
   name: string;
   avatar?: string;
 }
 
 interface TypingIndicatorProps {
   typingUsers: TypingUser[];
 }
 
 const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
   if (typingUsers.length === 0) return null;
 
   return (
     <div className="flex items-center gap-2 px-4 py-2 animate-in fade-in slide-in-from-bottom-2">
       <div className="flex -space-x-2">
         {typingUsers.slice(0, 3).map((user) => (
           <Avatar key={user.id} className="h-6 w-6 border-2 border-background">
             <AvatarImage src={user.avatar} />
             <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
               {user.name.charAt(0).toUpperCase()}
             </AvatarFallback>
           </Avatar>
         ))}
       </div>
       
       <div className="flex items-center gap-1 bg-muted/60 rounded-2xl px-3 py-1.5">
         <div className="flex gap-0.5">
           <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
           <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
           <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
         </div>
         <span className="text-xs text-muted-foreground ml-1">
           {typingUsers.length === 1
             ? `${typingUsers[0].name} is typing`
             : `${typingUsers.length} typing`}
         </span>
       </div>
     </div>
   );
 };
 
 export default TypingIndicator;