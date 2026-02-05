import { ArrowLeft, MoreVertical, Users, Search } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
   DropdownMenuSeparator,
 } from '@/components/ui/dropdown-menu';
 
 interface ChatHeaderProps {
   teamName: string;
   memberCount: number;
   teamAvatars: string[];
   onBack: () => void;
   onViewMembers?: () => void;
   onSearch?: () => void;
   isOnline?: boolean;
 }
 
 const ChatHeader = ({
   teamName,
   memberCount,
   teamAvatars,
   onBack,
   onViewMembers,
   onSearch,
   isOnline = true,
 }: ChatHeaderProps) => {
   return (
     <header className="sticky top-0 z-50 bg-gradient-to-r from-primary/95 to-primary/85 backdrop-blur-xl text-primary-foreground shadow-lg">
       <div className="flex items-center gap-2 px-2 py-2">
         <Button
           variant="ghost"
           size="icon"
           className="h-9 w-9 text-primary-foreground hover:bg-white/10 shrink-0"
           onClick={onBack}
         >
           <ArrowLeft className="h-5 w-5" />
         </Button>
 
         {/* Team Avatar Stack */}
         <div className="relative flex items-center cursor-pointer" onClick={onViewMembers}>
           <div className="flex -space-x-2">
             {teamAvatars.slice(0, 3).map((url, i) => (
               <Avatar key={i} className="h-9 w-9 border-2 border-primary ring-2 ring-primary">
                 <AvatarImage src={url} />
                 <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xs font-bold">
                   {String.fromCharCode(65 + i)}
                 </AvatarFallback>
               </Avatar>
             ))}
             {teamAvatars.length === 0 && (
               <Avatar className="h-9 w-9 border-2 border-primary">
                 <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                   <Users className="h-4 w-4" />
                 </AvatarFallback>
               </Avatar>
             )}
           </div>
           {isOnline && (
             <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-400 border-2 border-primary rounded-full animate-pulse" />
           )}
         </div>
 
         {/* Team Info */}
         <div className="flex-1 min-w-0 ml-1 cursor-pointer" onClick={onViewMembers}>
           <h1 className="text-base font-bold truncate leading-tight">{teamName}</h1>
           <div className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
             <span className="flex items-center gap-1">
               <Users className="h-3 w-3" />
               {memberCount} members
             </span>
             {isOnline && (
               <>
                 <span>•</span>
                 <span className="text-green-300">online</span>
               </>
             )}
           </div>
         </div>
 
         {/* Action Buttons */}
         <div className="flex items-center gap-0.5">
           <Button
             variant="ghost"
             size="icon"
             className="h-9 w-9 text-primary-foreground hover:bg-white/10"
             onClick={onSearch}
           >
             <Search className="h-5 w-5" />
           </Button>
 
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button
                 variant="ghost"
                 size="icon"
                 className="h-9 w-9 text-primary-foreground hover:bg-white/10"
               >
                 <MoreVertical className="h-5 w-5" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-48">
               <DropdownMenuItem onClick={onViewMembers}>
                 <Users className="h-4 w-4 mr-2" />
                 View Members
               </DropdownMenuItem>
               <DropdownMenuItem>
                 <Search className="h-4 w-4 mr-2" />
                 Search Messages
               </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuItem>
                 Mute Notifications
               </DropdownMenuItem>
               <DropdownMenuItem>
                 Clear Chat
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </div>
     </header>
   );
 };
 
 export default ChatHeader;