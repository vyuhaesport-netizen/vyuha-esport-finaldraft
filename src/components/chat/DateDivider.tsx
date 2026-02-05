 import { format, isToday, isYesterday } from 'date-fns';
 
 interface DateDividerProps {
   date: string;
 }
 
 const DateDivider = ({ date }: DateDividerProps) => {
   const dateObj = new Date(date);
   
   let label: string;
   if (isToday(dateObj)) {
     label = 'Today';
   } else if (isYesterday(dateObj)) {
     label = 'Yesterday';
   } else {
     label = format(dateObj, 'MMMM d, yyyy');
   }
 
   return (
     <div className="flex items-center justify-center my-4">
       <div className="bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
         <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
           {label}
         </span>
       </div>
     </div>
   );
 };
 
 export default DateDivider;