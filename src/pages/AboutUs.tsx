import AppLayout from '@/components/layout/AppLayout';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Trophy, Users, Gamepad2, Target } from 'lucide-react';

const AboutUs = () => {
  return (
    <AppLayout title="About Us">
      <div className="p-4 pb-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 text-center mb-6">
          <img src={vyuhaLogo} alt="Vyuha Esport" className="h-20 w-20 mx-auto mb-4" />
          <h1 className="font-gaming text-2xl font-bold mb-2">Vyuha Esport</h1>
          <p className="text-sm text-muted-foreground">India's Premier Gaming Tournament Platform</p>
        </div>

        {/* Mission */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-gaming text-lg font-bold mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Our Mission
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            At Vyuha Esport, we are committed to revolutionizing the esports ecosystem in India. Our mission is to provide a fair, transparent, and exciting platform where gamers of all skill levels can compete, grow, and earn recognition for their talents.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <p className="font-gaming text-2xl font-bold text-primary">10K+</p>
            <p className="text-xs text-muted-foreground">Active Players</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <p className="font-gaming text-2xl font-bold text-primary">500+</p>
            <p className="text-xs text-muted-foreground">Tournaments</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <p className="font-gaming text-2xl font-bold text-primary">10+</p>
            <p className="text-xs text-muted-foreground">Games</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <span className="text-primary font-bold text-lg">₹</span>
            </div>
            <p className="font-gaming text-2xl font-bold text-primary">50L+</p>
            <p className="text-xs text-muted-foreground">Prize Pool</p>
          </div>
        </div>

        {/* Story */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-gaming text-lg font-bold mb-3">Our Story</h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
            <p>
              Founded in 2024, Vyuha Esport was born from a passion for gaming and a vision to create opportunities for Indian gamers. We noticed the lack of organized, trustworthy tournament platforms and decided to build something different.
            </p>
            <p>
              Today, we host hundreds of tournaments across multiple games including BGMI, Free Fire, COD Mobile, Valorant, and more. Our platform connects organizers with players, creating a vibrant community of competitive gaming enthusiasts.
            </p>
            <p>
              What sets us apart is our commitment to fair play, instant payouts, and a seamless gaming experience. Whether you're a casual player looking for fun or a serious competitor aiming for the top, Vyuha Esport is your home.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h2 className="font-gaming text-lg font-bold mb-4">Our Values</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1 text-primary">Fair Play</h3>
              <p className="text-xs text-muted-foreground">We maintain strict anti-cheat policies and ensure every tournament is conducted fairly.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1 text-primary">Transparency</h3>
              <p className="text-xs text-muted-foreground">Clear rules, visible prize pools, and honest communication with our community.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1 text-primary">Community First</h3>
              <p className="text-xs text-muted-foreground">Every feature we build is designed with our gamers in mind.</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1 text-primary">Innovation</h3>
              <p className="text-xs text-muted-foreground">Constantly improving our platform with new features and better experiences.</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-gaming text-lg font-bold mb-3">Contact Us</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Email:</strong> support@vyuhaesport.com</p>
            <p><strong>Instagram:</strong> @vyuhaesport</p>
            <p><strong>Discord:</strong> discord.gg/vyuhaesport</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AboutUs;