import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { 
  Gamepad2, Trophy, Users, Zap, ChevronRight, Star, 
  Target, Shield, Crown, Sparkles, Eye, EyeOff, Loader2
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Invalid email');
const passwordSchema = z.string().min(6, 'Min 6 characters');

const Landing = () => {
  const [authDialog, setAuthDialog] = useState<'login' | 'signup' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string; terms?: string }>({});
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) navigate('/home');
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    try { emailSchema.parse(email); } catch { newErrors.email = 'Invalid email'; }
    try { passwordSchema.parse(password); } catch { newErrors.password = 'Min 6 characters'; }
    if (authDialog === 'signup') {
      if (!fullName.trim()) newErrors.fullName = 'Required';
      if (!acceptedTerms) newErrors.terms = 'Accept terms';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (authDialog === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
        } else {
          navigate('/home');
        }
      } else {
        const { data, error } = await signUp(email, password);
        if (error) {
          toast({ title: 'Signup Failed', description: error.message, variant: 'destructive' });
        } else if (data?.user) {
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            email: email.toLowerCase().trim(),
            full_name: fullName.trim(),
          }, { onConflict: 'user_id' });
          toast({ title: 'Account Created!', description: 'Complete your profile.' });
          navigate('/complete-profile');
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Trophy, title: 'Win Real Prizes', desc: 'Compete for cash prizes & exclusive rewards' },
    { icon: Shield, title: 'Fair Play', desc: 'Anti-cheat systems & transparent rules' },
    { icon: Users, title: 'Build Your Team', desc: 'Find teammates & form squads' },
    { icon: Zap, title: 'Instant Payouts', desc: 'Quick withdrawals to your wallet' },
  ];

  const opportunities = [
    { 
      title: 'For Players', 
      icon: Gamepad2,
      points: ['Join tournaments & win prizes', 'Track your stats & rankings', 'Connect with pro players', 'Build your esports career']
    },
    { 
      title: 'For Creators', 
      icon: Crown,
      points: ['Host your own tournaments', 'Earn commission on every match', 'Build your community', 'Get verified creator badge']
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gaming-purple/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-gaming-cyan/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-2">
          <img src={vyuhaLogo} alt="Vyuha" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30" />
          <span className="font-bold text-lg text-foreground">VYUHA</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setAuthDialog('login')} className="text-xs">
            Login
          </Button>
          <Button size="sm" onClick={() => setAuthDialog('signup')} className="text-xs bg-gradient-to-r from-primary to-gaming-purple">
            Sign Up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-12 text-center">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-gaming-purple/20 rounded-full blur-2xl scale-150 animate-pulse" />
          <img 
            src={vyuhaLogo} 
            alt="Vyuha Esport" 
            className="relative h-28 w-28 rounded-full object-cover ring-4 ring-primary/30 shadow-2xl animate-float"
          />
          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-warning animate-pulse" />
        </div>
        
        <h1 className="text-3xl font-bold mb-3 text-foreground">
          <span className="gradient-text">VYUHA ESPORT</span>
        </h1>
        
        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto leading-relaxed">
          India's Premier Platform for School, College & Local Esports Tournaments
        </p>

        <div className="flex justify-center gap-3 mb-8">
          <Button 
            size="lg" 
            onClick={() => setAuthDialog('signup')}
            className="bg-gradient-to-r from-primary to-gaming-purple hover:opacity-90 shadow-lg shadow-primary/25 gap-2"
          >
            Start Playing <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-center gap-6 text-center">
          <div>
            <p className="text-xl font-bold text-primary">10K+</p>
            <p className="text-[10px] text-muted-foreground">Players</p>
          </div>
          <div>
            <p className="text-xl font-bold text-success">₹50L+</p>
            <p className="text-[10px] text-muted-foreground">Prizes Given</p>
          </div>
          <div>
            <p className="text-xl font-bold text-warning">500+</p>
            <p className="text-[10px] text-muted-foreground">Tournaments</p>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="relative z-10 px-4 py-8">
        <div className="glass-card rounded-2xl p-5 max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">Our Vision</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To democratize esports in India by empowering schools, colleges, and local communities to organize professional-grade tournaments. We believe every gamer deserves a fair chance to compete and win.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-4 py-8">
        <h2 className="text-lg font-bold text-center mb-5 text-foreground">Why Vyuha?</h2>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="glass-card rounded-xl p-4 hover-lift"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <feature.icon className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-xs text-foreground">{feature.title}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Opportunities Section */}
      <section className="relative z-10 px-4 py-8">
        <h2 className="text-lg font-bold text-center mb-5 text-foreground">Opportunities</h2>
        <div className="space-y-3 max-w-md mx-auto">
          {opportunities.map((opp, i) => (
            <div key={i} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <opp.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">{opp.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {opp.points.map((point, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 text-warning flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* About Creator */}
      <section className="relative z-10 px-4 py-8 pb-24">
        <div className="glass-card rounded-2xl p-5 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <img 
              src="/abhishek-shukla.jpg" 
              alt="Abhishek Shukla" 
              className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/30"
            />
            <div>
              <h3 className="font-bold text-foreground">Abhishek Shukla</h3>
              <p className="text-[10px] text-muted-foreground">Founder & CEO</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An 18-year-old engineering student and tech enthusiast who built Vyuha to bridge the gap between casual gaming and professional esports. Passionate about creating opportunities for the next generation of Indian gamers.
          </p>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
            <a href="https://instagram.com/abhishek.shhh" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              @abhishek.shhh
            </a>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50">
        <Button 
          className="w-full max-w-md mx-auto block bg-gradient-to-r from-primary to-gaming-purple shadow-lg shadow-primary/25"
          onClick={() => setAuthDialog('signup')}
        >
          Join Vyuha Now <Sparkles className="h-4 w-4 ml-2 inline" />
        </Button>
      </div>

      {/* Auth Dialog */}
      <Dialog open={authDialog !== null} onOpenChange={(open) => !open && setAuthDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={vyuhaLogo} alt="Vyuha" className="h-8 w-8 rounded-full" />
              {authDialog === 'login' ? 'Welcome Back' : 'Join Vyuha'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {authDialog === 'signup' && (
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input 
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors(p => ({...p, fullName: undefined})); }}
                  placeholder="Your name"
                  className={errors.fullName ? 'border-destructive' : ''}
                />
                {errors.fullName && <p className="text-[10px] text-destructive">{errors.fullName}</p>}
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input 
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(p => ({...p, email: undefined})); }}
                placeholder="you@example.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-[10px] text-destructive">{errors.email}</p>}
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(p => ({...p, password: undefined})); }}
                  placeholder="••••••••"
                  className={errors.password ? 'border-destructive' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-destructive">{errors.password}</p>}
            </div>

            {authDialog === 'signup' && (
              <div className="flex items-start gap-2">
                <Checkbox 
                  checked={acceptedTerms} 
                  onCheckedChange={(c) => { setAcceptedTerms(!!c); setErrors(p => ({...p, terms: undefined})); }}
                />
                <Label className="text-[10px] text-muted-foreground leading-tight">
                  I accept the <a href="/terms" className="text-primary hover:underline">Terms</a> & <a href="/refund" className="text-primary hover:underline">Refund Policy</a>
                </Label>
              </div>
            )}
            {errors.terms && <p className="text-[10px] text-destructive">{errors.terms}</p>}

            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-gaming-purple">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : authDialog === 'login' ? 'Login' : 'Create Account'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {authDialog === 'login' ? (
                <>Don't have an account? <button type="button" onClick={() => setAuthDialog('signup')} className="text-primary hover:underline">Sign Up</button></>
              ) : (
                <>Already have an account? <button type="button" onClick={() => setAuthDialog('login')} className="text-primary hover:underline">Login</button></>
              )}
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;
