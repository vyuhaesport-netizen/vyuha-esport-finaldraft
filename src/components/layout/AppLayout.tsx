import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

const AppLayout = ({ children, title }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gaming-cyan/5 rounded-full blur-3xl" />
      </div>
      
      {title && (
        <header className="sticky top-0 z-40 glass-card px-4 py-3 border-b border-border/50">
          <h1 className="text-lg font-semibold text-center">{title}</h1>
        </header>
      )}
      <main className="flex-1 pb-20 overflow-y-auto relative z-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;