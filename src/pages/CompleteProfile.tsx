import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import vyuhaLogo from '@/assets/vyuha-logo.png';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CompleteProfile = () => {
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    preferred_game: '',
    in_game_name: '',
    game_uid: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    checkExistingProfile();
  }, [user, navigate]);

  const checkExistingProfile = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, phone, preferred_game, in_game_name, game_uid')
        .eq('user_id', user.id)
        .single();

      // If profile is already complete, redirect to home
      if (profile?.full_name && profile?.username && profile?.phone && 
          profile?.preferred_game && profile?.in_game_name && profile?.game_uid) {
        navigate('/home');
        return;
      }

      // Pre-fill existing data
      if (profile) {
        setFormData({
          full_name: profile.full_name || '',
          username: profile.username || '',
          phone: profile.phone || '',
          preferred_game: profile.preferred_game || '',
          in_game_name: profile.in_game_name || '',
          game_uid: profile.game_uid || '',
        });
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setCheckingProfile(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (!formData.preferred_game) {
      newErrors.preferred_game = 'Please select your primary game';
    }
    if (!formData.in_game_name.trim()) {
      newErrors.in_game_name = 'In-game name is required';
    }
    if (!formData.game_uid.trim()) {
      newErrors.game_uid = 'Game UID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', formData.username.toLowerCase())
        .neq('user_id', user.id)
        .maybeSingle();

      if (existingUser) {
        setErrors({ username: 'This username is already taken' });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          username: formData.username.toLowerCase().trim(),
          phone: formData.phone.replace(/\D/g, ''),
          preferred_game: formData.preferred_game,
          in_game_name: formData.in_game_name.trim(),
          game_uid: formData.game_uid.trim(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Profile Complete!', description: 'Welcome to Vyuha Esport!' });
      navigate('/home');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: 'Failed to save profile. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <img src={vyuhaLogo} alt="Vyuha Esport" className="h-16 w-16 rounded-full object-cover mb-3" />
            <h1 className="text-xl font-bold text-gray-900">Complete Your Profile</h1>
            <p className="text-sm text-gray-600 text-center mt-1">
              Please fill in all details to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value });
                  setErrors({ ...errors, full_name: '' });
                }}
                placeholder="Enter your full name"
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name}</p>}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') });
                  setErrors({ ...errors, username: '' });
                }}
                placeholder="Choose a unique username"
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && <p className="text-red-500 text-xs">{errors.username}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setErrors({ ...errors, phone: '' });
                }}
                placeholder="10-digit phone number"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
            </div>

            {/* Primary Game */}
            <div className="space-y-1.5">
              <Label htmlFor="preferred_game" className="text-sm font-medium text-gray-700">
                Primary Game <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.preferred_game}
                onValueChange={(value) => {
                  setFormData({ ...formData, preferred_game: value });
                  setErrors({ ...errors, preferred_game: '' });
                }}
              >
                <SelectTrigger className={errors.preferred_game ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select your main game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free Fire">Free Fire</SelectItem>
                  <SelectItem value="BGMI">BGMI</SelectItem>
                  <SelectItem value="Call of Duty Mobile">Call of Duty Mobile</SelectItem>
                  <SelectItem value="PUBG New State">PUBG New State</SelectItem>
                </SelectContent>
              </Select>
              {errors.preferred_game && <p className="text-red-500 text-xs">{errors.preferred_game}</p>}
            </div>

            {/* In-Game Name */}
            <div className="space-y-1.5">
              <Label htmlFor="in_game_name" className="text-sm font-medium text-gray-700">
                In-Game Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="in_game_name"
                value={formData.in_game_name}
                onChange={(e) => {
                  setFormData({ ...formData, in_game_name: e.target.value });
                  setErrors({ ...errors, in_game_name: '' });
                }}
                placeholder="Your name in the game"
                className={errors.in_game_name ? 'border-red-500' : ''}
              />
              {errors.in_game_name && <p className="text-red-500 text-xs">{errors.in_game_name}</p>}
            </div>

            {/* Game UID */}
            <div className="space-y-1.5">
              <Label htmlFor="game_uid" className="text-sm font-medium text-gray-700">
                Game UID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="game_uid"
                value={formData.game_uid}
                onChange={(e) => {
                  setFormData({ ...formData, game_uid: e.target.value });
                  setErrors({ ...errors, game_uid: '' });
                }}
                placeholder="Your unique game ID"
                className={errors.game_uid ? 'border-red-500' : ''}
              />
              {errors.game_uid && <p className="text-red-500 text-xs">{errors.game_uid}</p>}
              <p className="text-xs text-gray-500">This is used for account recovery</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-gray-900 text-white font-bold py-3 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
