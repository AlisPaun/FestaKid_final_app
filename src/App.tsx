import React, { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, MapPin, Gift as GiftIcon, Users, Sparkles, ChevronLeft, Trash2, Image as ImageIcon, Mail, MessageCircle, Share2, Contact, Edit2, Upload, Apple } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it, enGB, ro, fr } from 'date-fns/locale';

const dateLocales: Record<string, any> = {
  it: it,
  en: enGB,
  ro: ro,
  fr: fr
};

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Party, Guest, Gift } from './types';
import { subscribeToParties, saveParty, deleteParty, subscribeToGuests, subscribeToGifts, saveGuest, saveGift, subscribeToParty, saveFeedback } from './lib/db';
import { generateInvitation, searchLocation } from './lib/gemini';
import { useLanguage } from './lib/LanguageContext';
import { compressImage } from './lib/imageUtils';
import { CustomThemeConfigEditor } from './components/CustomThemeConfigEditor';
import { ShareDialog } from './components/ShareDialog';
import { FeedbackDialog } from './components/FeedbackDialog';
import { Logo } from './components/Logo';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

const getPublicUrl = () => {
  const origin = window.location.origin;
  
  // Detect if we are in an AI Studio preview environment
  const isAistudioPreview = 
    origin.includes('ais-dev-') || 
    origin.includes('ais-pre-') || 
    origin.includes('stackblitz') ||
    origin.includes('localhost') ||
    origin.includes('0.0.0.0');

  // If we are on a production run.app site that IS NOT a preview, use origin
  if (!isAistudioPreview && origin.includes('.run.app')) {
    return origin;
  }

  const appUrl = process.env.VITE_APP_URL;

  // If we have a configured APP_URL and it's not the editor portal, use it
  if (appUrl && !appUrl.includes('ai.studio/apps') && !appUrl.includes('ais-dev-')) {
    return appUrl.replace(/\/$/, '');
  }

  // Heuristic: If we are in the dev preview (ais-dev), point to the shared version (ais-pre)
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }

  // Fallback to origin if no APP_URL is set or if we are already on a public-looking URL
  return origin;
};

const getThemeStyles = (theme?: string, customConfig?: any) => {
  if (theme === 'custom' && customConfig) {
    return 'border-opacity-20'; // Base classes, inline styles will handle the rest
  }
  const t = theme?.toLowerCase() || '';
  if (t.includes('spazio') || t.includes('space')) return 'bg-slate-900 text-white border-blue-500/30';
  if (t.includes('principessa') || t.includes('princess') || t.includes('principesse')) return 'bg-pink-50 text-pink-900 border-pink-200';
  if (t.includes('dinosauri') || t.includes('dino')) return 'bg-emerald-50 text-emerald-900 border-emerald-200';
  if (t.includes('supereroi') || t.includes('hero')) return 'bg-red-50 text-red-900 border-red-200';
  if (t.includes('mare') || t.includes('sea')) return 'bg-cyan-50 text-cyan-900 border-cyan-200';
  if (t.includes('safari') || t.includes('animali')) return 'bg-orange-50 text-orange-900 border-orange-200';
  return 'bg-white/90 text-[var(--color-chocolate)] border-white/20';
};

const getThemePattern = (theme?: string, customConfig?: any) => {
  if (theme === 'custom' && customConfig?.backgroundImageUrl) {
    return `url(${customConfig.backgroundImageUrl})`;
  }

  // Predefined SVG patterns
  const patterns: Record<string, string> = {
    balloons: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.1'%3E%3Ccircle cx='40' cy='40' r='15' fill='%23000'/%3E%3Cpath d='M40 55 C40 65 35 70 35 80' stroke='%23000' fill='none'/%3E%3Ccircle cx='70' cy='30' r='12' fill='%23000'/%3E%3Cpath d='M70 42 C70 52 75 57 75 67' stroke='%23000' fill='none'/%3E%3C/g%3E%3C/svg%3E")`,
    stars: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.1'%3E%3Cpath d='M20 10l3 7h7l-5 4 2 7-6-4-6 4 2-7-5-4h7z' fill='%23000'/%3E%3Cpath d='M60 40l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z' fill='%23000'/%3E%3Ccircle cx='10' cy='60' r='2' fill='%23000'/%3E%3Ccircle cx='50' cy='15' r='1.5' fill='%23000'/%3E%3C/g%3E%3C/svg%3E")`,
    hearts: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.1'%3E%3Cpath d='M20 20c-5-5-10 0-10 5 0 5 10 10 10 10s10-5 10-10c0-5-5-10-10-5z' fill='%23000'/%3E%3Cpath d='M60 50c-4-4-8 0-8 4 0 4 8 8 8 8s8-4 8-4c0-4-4-8-8-4z' fill='%23000'/%3E%3C/g%3E%3C/svg%3E")`,
    paws: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.1' fill='%23000'%3E%3Ccircle cx='30' cy='40' r='8'/%3E%3Ccircle cx='20' cy='25' r='5'/%3E%3Ccircle cx='30' cy='20' r='5'/%3E%3Ccircle cx='40' cy='25' r='5'/%3E%3Ccircle cx='75' cy='75' r='6'/%3E%3Ccircle cx='68' cy='63' r='4'/%3E%3Ccircle cx='75' cy='60' r='4'/%3E%3Ccircle cx='82' cy='63' r='4'/%3E%3C/g%3E%3C/svg%3E")`,
    waves: `url("data:image/svg+xml,%3Csvg width='100' height='40' viewBox='0 0 100 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q12.5 5 25 20 T50 20 T75 20 T100 20' stroke='%23000' fill='none' stroke-width='2' opacity='0.1'/%3E%3Cpath d='M0 30 Q12.5 15 25 30 T50 30 T75 30 T100 30' stroke='%23000' fill='none' stroke-width='1' opacity='0.05'/%3E%3C/svg%3E")`,
    dino: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.1' fill='%23000'%3E%3Cpath d='M20 50 Q20 30 40 30 T60 50 T40 70 T20 50'/%3E%3Ccircle cx='50' cy='40' r='3'/%3E%3Cpath d='M30 15 L35 25 L25 25 Z'/%3E%3Cpath d='M70 70 L75 80 L65 80 Z'/%3E%3C/g%3E%3C/svg%3E")`,
  };

  if (theme === 'custom' && customConfig?.backgroundPattern) {
    return patterns[customConfig.backgroundPattern] || 'none';
  }

  const t = theme?.toLowerCase() || '';
  if (t.includes('spazio') || t.includes('space')) return patterns.stars;
  if (t.includes('principessa') || t.includes('princess') || t.includes('principesse')) return patterns.hearts;
  if (t.includes('dinosauri') || t.includes('dino')) return patterns.dino;
  if (t.includes('supereroi') || t.includes('hero')) return patterns.stars;
  if (t.includes('mare') || t.includes('sea')) return patterns.waves;
  if (t.includes('safari') || t.includes('animali')) return patterns.paws;
  
  // Default birthday pattern for others
  return patterns.balloons;
};

const getCustomInlineStyles = (theme?: string, customConfig?: any): React.CSSProperties | undefined => {
  if (!customConfig) return undefined;
  
  return {
    backgroundColor: (theme === 'custom' || !['Dinosauri', 'Spazio', 'Principesse', 'Supereroi', 'Mare', 'Safari'].includes(theme || '')) 
      ? (customConfig.backgroundColor || undefined) 
      : undefined,
    color: customConfig.textColor || undefined,
    borderColor: customConfig.textColor ? `${customConfig.textColor}33` : undefined,
  };
};

const themeDefaultColors: Record<string, string> = {
  'Dinosauri': '#064e3b',
  'Spazio': '#ffffff',
  'Principesse': '#831843',
  'Supereroi': '#7f1d1d',
  'Mare': '#164e63',
  'Safari': '#7c2d12',
  'custom': '#000000'
};

export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isShareAppOpen, setIsShareAppOpen] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Form state
  const [newParty, setNewParty] = useState({
    title: '',
    date: '',
    location: '',
    theme: '',
    description: '',
    customThemeConfig: {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      backgroundImageUrl: '',
      backgroundPattern: 'balloons'
    }
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const [guestParty, setGuestParty] = useState<Party | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('partyId');
    if (pId) {
      setSelectedPartyId(pId);
      setIsGuestMode(true);
    }
  }, []);

  useEffect(() => {
    if (selectedPartyId && isGuestMode) {
      const unsubscribe = subscribeToParty(selectedPartyId, (data) => {
        setGuestParty(data);
      });
      return () => unsubscribe();
    } else {
      setGuestParty(null);
    }
  }, [selectedPartyId, isGuestMode]);

  useEffect(() => {
    if (authLoading || !user) {
      if (!user) setParties([]);
      return;
    }

    const unsubscribe = subscribeToParties((data) => {
      setParties(data);
    });
    return () => unsubscribe();
  }, [authLoading, user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedPartyId(null);
      setIsGuestMode(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const refreshParties = () => {
    // No longer needed with real-time updates
  };

  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const handleSearchLocation = async () => {
    if (!newParty.location) return;
    setIsSearchingLocation(true);
    const result = await searchLocation(newParty.location);
    if (result) {
      setNewParty({ ...newParty, location: result });
    }
    setIsSearchingLocation(false);
  };

  const handleCreateParty = async () => {
    if (!user) return;
    const party: Party = {
      id: generateId(),
      title: newParty.title,
      date: newParty.date,
      location: { address: newParty.location },
      theme: newParty.theme,
      description: newParty.description,
      hostId: user.uid,
      photoUrls: [],
      createdAt: new Date().toISOString(),
      language: language
    };
    await saveParty(party);
    setIsCreateDialogOpen(false);
    setNewParty({ title: '', date: '', location: '', theme: '', description: '' });
  };

  const handleDeleteParty = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteParty(id);
  };

  const selectedParty = isGuestMode ? guestParty : parties.find(p => p.id === selectedPartyId);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#FFD93D] via-[#FF6B6B] to-[#4ECDC4] overflow-hidden">
      <Logo className="hidden" />
      <ShareDialog 
        isOpen={isShareAppOpen} 
        onOpenChange={setIsShareAppOpen} 
        partyTitle={t('shareAppTitle')}
        shareUrl={getPublicUrl()}
      />
      <FeedbackDialog 
        isOpen={isFeedbackOpen} 
        onOpenChange={setIsFeedbackOpen} 
      />
      <header className="shrink-0 flex items-center justify-between px-4 h-16 sm:px-8 border-b bg-white/80 backdrop-blur-md relative z-50">
        <div className="flex items-center gap-3">
          <Logo className="h-8 w-auto" />
          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
          <p className="hidden sm:block text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none">{t('appSubtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsShareAppOpen(true)} className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg">
              <Share2 size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsFeedbackOpen(true)} className="h-9 w-9 text-slate-400 hover:text-amber-600 hover:bg-amber-50/50 rounded-lg">
              <MessageCircle size={18} />
            </Button>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
            <SelectTrigger className="w-[50px] sm:w-[50px] h-9 border-none bg-transparent hover:bg-slate-50 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="it">🇮🇹</SelectItem>
              <SelectItem value="en">🇬🇧</SelectItem>
              <SelectItem value="ro">🇷🇴</SelectItem>
              <SelectItem value="fr">🇫🇷</SelectItem>
            </SelectContent>
          </Select>

          {user && !selectedPartyId && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger render={<Button className="btn-primary flex items-center gap-2 w-auto h-10 px-3 sm:px-6 justify-center" />}>
                <Plus size={20} />
                <span className="hidden sm:inline">{t('newParty')}</span>
              </DialogTrigger>
              <DialogContent 
                className={cn("sm:max-w-[425px] transition-colors duration-500 overflow-y-auto max-h-[90vh]", getThemeStyles(newParty.theme, newParty.customThemeConfig))}
                style={getCustomInlineStyles(newParty.theme, newParty.customThemeConfig)}
              >
                <div 
                  className="absolute inset-0 opacity-10 pointer-events-none" 
                  style={{ 
                    backgroundImage: getThemePattern(newParty.theme, newParty.customThemeConfig),
                    backgroundSize: newParty.customThemeConfig?.backgroundImageUrl ? 'cover' : '20px 20px',
                    backgroundPosition: newParty.customThemeConfig?.backgroundImageUrl ? 'center' : undefined,
                    opacity: newParty.customThemeConfig?.backgroundImageUrl ? 0.3 : 0.1
                  }} 
                />
                <DialogHeader className="relative z-10">
                  <DialogTitle>{t('createEvent')}</DialogTitle>
                  <DialogDescription className={cn(newParty.theme?.toLowerCase().includes('spazio') ? 'text-blue-200' : 'text-slate-500')}>
                    {t('eventDetails')}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 relative z-10">
                  <div className="grid gap-2">
                    <Label htmlFor="title">{t('partyName')}</Label>
                    <Input 
                      id="title" 
                      value={newParty.title} 
                      onChange={e => setNewParty({...newParty, title: e.target.value})} 
                      placeholder={t('placeholderTitle')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">{t('dateAndTime')}</Label>
                    <Input 
                      id="date" 
                      type="datetime-local" 
                      value={newParty.date} 
                      onChange={e => setNewParty({...newParty, date: e.target.value})} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">{t('location')}</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="location" 
                        value={newParty.location} 
                        onChange={e => setNewParty({...newParty, location: e.target.value})} 
                        placeholder={t('placeholderLocation')}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        onClick={handleSearchLocation}
                        disabled={isSearchingLocation}
                        title={t('verifyAddress')}
                      >
                        <MapPin size={16} className={isSearchingLocation ? 'animate-pulse' : ''} />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="theme">{t('theme')}</Label>
                    <Select 
                      value={['Dinosauri', 'Spazio', 'Principesse', 'Supereroi', 'Mare', 'Safari'].includes(newParty.theme) ? newParty.theme : (newParty.theme ? 'custom' : '')} 
                      onValueChange={(value) => {
                        const defaultColor = themeDefaultColors[value] || '#000000';
                        if (value === 'custom') {
                          setNewParty({
                            ...newParty, 
                            theme: '', 
                            customThemeConfig: { ...newParty.customThemeConfig, textColor: defaultColor, backgroundColor: '#ffffff' }
                          });
                        } else {
                          setNewParty({
                            ...newParty, 
                            theme: value,
                            customThemeConfig: { ...newParty.customThemeConfig, textColor: defaultColor }
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder={t('selectTheme')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dinosauri">{t('themeDinosaurs')}</SelectItem>
                        <SelectItem value="Spazio">{t('themeSpace')}</SelectItem>
                        <SelectItem value="Principesse">{t('themePrincesses')}</SelectItem>
                        <SelectItem value="Supereroi">{t('themeSuperheroes')}</SelectItem>
                        <SelectItem value="Mare">{t('themeSea')}</SelectItem>
                        <SelectItem value="Safari">{t('themeSafari')}</SelectItem>
                        <SelectItem value="custom">{t('themeCustom')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {['Dinosauri', 'Spazio', 'Principesse', 'Supereroi', 'Mare', 'Safari'].includes(newParty.theme) ? (
                      <div className="mt-2">
                         <CustomThemeConfigEditor 
                          config={newParty.customThemeConfig} 
                          onChange={(config) => setNewParty({ ...newParty, customThemeConfig: config })} 
                        />
                      </div>
                    ) : (
                      <>
                        <Input 
                          id="theme-custom" 
                          value={newParty.theme} 
                          onChange={e => setNewParty({...newParty, theme: e.target.value})} 
                          placeholder={t('placeholderTheme')}
                          className="mt-2"
                        />
                        <CustomThemeConfigEditor 
                          config={newParty.customThemeConfig} 
                          onChange={(config) => setNewParty({ ...newParty, customThemeConfig: config })} 
                        />
                      </>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="desc">{t('description')}</Label>
                    <Textarea 
                      id="desc" 
                      value={newParty.description} 
                      onChange={e => setNewParty({...newParty, description: e.target.value})} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateParty} className="btn-primary w-full">{t('create')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {user && (
            <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-red-500 h-10 px-2 sm:px-4">
              <LogOut size={20} />
              <span className="hidden sm:inline ml-2">{t('logout')}</span>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-hide">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {authLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-brand-primary)]"></div>
            </div>
          ) : !user && !isGuestMode ? (
            <Card className="birthday-card text-center py-20 bg-white/60 backdrop-blur-md border-white/40">
              <CardHeader>
                <CardTitle className="text-3xl mb-2 text-[var(--color-brand-primary)]">{t('welcome')}</CardTitle>
                <CardDescription className="text-lg text-[var(--color-chocolate)]">{t('loginToManage')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-24 h-24 bg-[var(--color-brand-secondary)] rounded-full flex items-center justify-center text-white mb-4 animate-bounce">
                    <Sparkles size={48} />
                  </div>
                  <Button onClick={handleLogin} className="btn-primary px-8 py-6 text-lg rounded-2xl flex items-center gap-3">
                    <LogIn size={24} />
                    {t('loginWithGoogle')}
                  </Button>
                  <Button onClick={handleLogin} className="bg-black text-white px-8 py-6 text-lg rounded-2xl flex items-center gap-3 hover:bg-black/90 transition-all">
                    <Apple size={24} />
                    {t('loginWithIOS')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              {!selectedPartyId ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {parties.length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400">{t('noPartiesCreated')}</p>
                  </div>
                ) : (
                  parties.map(party => (
                    <Card 
                      key={party.id} 
                      className={cn("birthday-card cursor-pointer group relative overflow-hidden", getThemeStyles(party.theme, party.customThemeConfig))}
                      style={getCustomInlineStyles(party.theme, party.customThemeConfig)}
                      onClick={() => setSelectedPartyId(party.id)}
                    >
                      <div 
                        className="absolute inset-0 opacity-10 pointer-events-none" 
                        style={{ 
                          backgroundImage: getThemePattern(party.theme, party.customThemeConfig),
                          backgroundSize: party.customThemeConfig?.backgroundImageUrl ? 'cover' : '60px 60px',
                          backgroundPosition: party.customThemeConfig?.backgroundImageUrl ? 'center' : undefined,
                          opacity: party.customThemeConfig?.backgroundImageUrl ? 0.3 : 0.4
                        }} 
                      />
                      <CardHeader className="pb-2 relative z-10">
                        <div className="flex justify-between items-start">
                          <Badge variant="secondary" className="bg-[var(--color-brand-accent)] text-[var(--color-chocolate)]">
                            {party.theme || t('generic')}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-red-500"
                            onClick={(e) => handleDeleteParty(party.id, e)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        <CardTitle className="text-xl mt-2">{party.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <CalendarIcon size={14} /> {party.date ? format(new Date(party.date), 'dd/MM/yyyy HH:mm', { locale: dateLocales[language] }) : t('addressNotSet')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <MapPin size={14} /> {party.location.address}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSelectedPartyId(null);
                    setIsGuestMode(false);
                    window.history.pushState({}, '', window.location.pathname);
                  }} 
                  className="mb-6 flex gap-2 items-center text-slate-500 hover:text-[var(--color-chocolate)]"
                >
                  <ChevronLeft size={20} /> {t('backToList')}
                </Button>
                
                {selectedParty && <PartyDetails party={selectedParty} onUpdate={refreshParties} isGuestMode={isGuestMode} />}
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>

        {!selectedPartyId && !isGuestMode && (
          <div className="space-y-6">
            <Card className="birthday-card p-4">
              <CardTitle className="text-sm font-semibold mb-4">{t('calendar')}</CardTitle>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border shadow-none"
              />
            </Card>
            
            <Card className="birthday-card p-4 bg-[#00674F]">
              <h3 className="font-bold mb-2 text-emerald-300">{t('upcomingEvents')}</h3>
              <div className="space-y-2">
                {parties.slice(0, 3).map(p => (
                  <div key={p.id} className="text-xs bg-white/10 p-2 rounded-lg border border-white/10">
                    <p className="font-medium text-emerald-100">{p.title}</p>
                    <p className="text-emerald-300/80">
                      {p.date && !isNaN(new Date(p.date).getTime()) 
                        ? format(new Date(p.date), 'dd MMM', { locale: dateLocales[language] }) 
                        : t('tbd')}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PartyDetails({ party: initialParty, onUpdate, isGuestMode }: { party: Party, onUpdate: () => void, isGuestMode?: boolean }) {
  const { t, language, setLanguage } = useLanguage();
  const [party, setParty] = useState(initialParty);
  const [invitation, setInvitation] = useState(party.invitationText || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
  const [newGuest, setNewGuest] = useState({ name: '', email: '', phone: '' });
  const [newGift, setNewGift] = useState({ name: '', url: '' });
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [invitationImageUrl, setInvitationImageUrl] = useState(party.invitationImageUrl || '');
  const [previewTheme, setPreviewTheme] = useState(party.theme || '');
  const [previewCustomThemeConfig, setPreviewCustomThemeConfig] = useState(party.customThemeConfig || {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    backgroundImageUrl: '',
    backgroundPattern: 'balloons'
  });
  const [imageError, setImageError] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editParty, setEditParty] = useState({
    title: party.title,
    date: party.date,
    location: party.location.address,
    theme: party.theme || '',
    description: party.description || '',
    customThemeConfig: party.customThemeConfig || {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      backgroundImageUrl: ''
    }
  });
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  useEffect(() => {
    setParty(initialParty);
    setInvitation(initialParty.invitationText || '');
    setInvitationImageUrl(initialParty.invitationImageUrl || '');
    setPreviewTheme(initialParty.theme || '');
    setPreviewCustomThemeConfig(initialParty.customThemeConfig || {
      backgroundColor: '#ffffff',
      textColor: '#000000',
      backgroundImageUrl: ''
    });

    // If in guest mode, set the language to match the party's language
    if (isGuestMode && initialParty.language && initialParty.language !== language) {
      setLanguage(initialParty.language as any);
    }

    setEditParty({
      title: initialParty.title,
      date: initialParty.date,
      location: initialParty.location.address,
      theme: initialParty.theme || '',
      description: initialParty.description || '',
      customThemeConfig: initialParty.customThemeConfig || {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        backgroundImageUrl: ''
      }
    });
    setImageError(false);
    
    const unsubGuests = subscribeToGuests(initialParty.id, setGuests);
    const unsubGifts = subscribeToGifts(initialParty.id, setGifts);
    
    return () => {
      unsubGuests();
      unsubGifts();
    };
  }, [initialParty]);

  const handleSavePartyEdit = async () => {
    const updatedParty = {
      ...party,
      title: editParty.title,
      date: editParty.date,
      location: { address: editParty.location },
      theme: editParty.theme,
      description: editParty.description,
      customThemeConfig: editParty.customThemeConfig,
      language: language
    };
    await saveParty(updatedParty);
    setParty(updatedParty);
    setIsEditDialogOpen(false);
    onUpdate();
  };

  const handleSearchLocation = async () => {
    if (!editParty.location) return;
    setIsSearchingLocation(true);
    const result = await searchLocation(editParty.location);
    if (result) {
      setEditParty({ ...editParty, location: result });
    }
    setIsSearchingLocation(false);
  };

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    const text = await generateInvitation({
      title: party.title,
      theme: party.theme || 'Compleanno',
      date: party.date,
      location: party.location.address,
      description: party.description
    }, language);
    setInvitation(text || '');
    const updatedParty = { ...party, invitationText: text || '' };
    await saveParty(updatedParty);
    setIsGenerating(false);
  };

  const handleAddPhoto = async () => {
    if (!newPhotoUrl) return;
    const updatedParty = { ...party, photoUrls: [...party.photoUrls, newPhotoUrl] };
    await saveParty(updatedParty);
    setNewPhotoUrl('');
  };

  const handlePartyPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      const updatedParty = { ...party, photoUrls: [...party.photoUrls, base64] };
      await saveParty(updatedParty);
    } catch (err) {
      console.error("Error compressing image:", err);
    }
  };

  const handleInvitationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setInvitationImageUrl(base64);
      setImageError(false);
    } catch (err) {
      console.error("Error compressing image:", err);
    }
  };

  const handleSaveInvitation = async () => {
    const updatedParty = { 
      ...party, 
      invitationText: invitation, 
      invitationImageUrl: invitationImageUrl,
      theme: previewTheme,
      customThemeConfig: previewCustomThemeConfig,
      language: language
    };
    await saveParty(updatedParty);
  };

  const handleShare = async () => {
    setIsShareDialogOpen(true);
  };

  const handleAddGuest = async () => {
    if (!newGuest.name) return;
    const guest: Guest = {
      id: generateId(),
      partyId: party.id,
      name: newGuest.name,
      email: newGuest.email,
      phone: newGuest.phone,
      status: 'pending',
      plusOnes: 0
    };
    await saveGuest(guest);
    setNewGuest({ name: '', email: '', phone: '' });
  };

  const handleSelectContact = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel', 'email'];
        const opts = { multiple: false };
        // @ts-ignore - Contact Picker API is not fully typed in standard DOM lib yet
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          setNewGuest({
            name: contact.name?.[0] || '',
            phone: contact.tel?.[0] || '',
            email: contact.email?.[0] || ''
          });
        }
      } catch (ex) {
        console.error('Error selecting contact:', ex);
      }
    } else {
      alert(t('contactNotSupported'));
    }
  };

  const handleAddGift = async () => {
    if (!newGift.name) return;
    const gift: Gift = {
      id: generateId(),
      partyId: party.id,
      name: newGift.name,
      url: newGift.url
    };
    await saveGift(gift);
    setNewGift({ name: '', url: '' });
  };

  const updateGuestStatus = async (id: string, status: Guest['status']) => {
    const guest = guests.find(g => g.id === id);
    if (guest) {
      const updated = { ...guest, status };
      await saveGuest(updated);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card 
          className={cn("birthday-card border-none shadow-lg relative overflow-hidden", getThemeStyles(party.theme, party.customThemeConfig))}
          style={getCustomInlineStyles(party.theme, party.customThemeConfig)}
        >
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none" 
            style={{ 
              backgroundImage: getThemePattern(party.theme, party.customThemeConfig),
              backgroundSize: party.customThemeConfig?.backgroundImageUrl ? 'cover' : '24px 24px',
              backgroundPosition: 'center',
              opacity: party.customThemeConfig?.backgroundImageUrl ? 0.4 : 0.2
            }} 
          />
          <CardHeader className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2">{party.title}</CardTitle>
                <Badge className="bg-[var(--color-brand-secondary)] text-white">{party.theme}</Badge>
              </div>
              <div className="flex gap-2">
                {!isGuestMode && (
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger render={<Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-current border-none" title="Modifica Festa" />}>
                      <Edit2 size={18} />
                    </DialogTrigger>
                    <DialogContent 
                      className={cn("sm:max-w-[425px] transition-colors duration-500 overflow-y-auto max-h-[90vh]", getThemeStyles(editParty.theme, editParty.customThemeConfig))}
                      style={getCustomInlineStyles(editParty.theme, editParty.customThemeConfig)}
                    >
                      <div 
                        className="absolute inset-0 opacity-10 pointer-events-none" 
                        style={{ 
                          backgroundImage: getThemePattern(editParty.theme, editParty.customThemeConfig),
                          backgroundSize: editParty.customThemeConfig?.backgroundImageUrl ? 'cover' : '20px 20px',
                          backgroundPosition: 'center',
                          opacity: editParty.customThemeConfig?.backgroundImageUrl ? 0.3 : 0.1
                        }} 
                      />
                      <DialogHeader className="relative z-10">
                        <DialogTitle>{t('editEvent')}</DialogTitle>
                        <DialogDescription className={cn(editParty.theme?.toLowerCase().includes('spazio') ? 'text-blue-200' : 'text-slate-500')}>
                          {t('updateDetails')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4 relative z-10">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-title">{t('partyName')}</Label>
                          <Input 
                            id="edit-title" 
                            value={editParty.title} 
                            onChange={e => setEditParty({...editParty, title: e.target.value})} 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-date">{t('dateAndTime')}</Label>
                          <Input 
                            id="edit-date" 
                            type="datetime-local" 
                            value={editParty.date} 
                            onChange={e => setEditParty({...editParty, date: e.target.value})} 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-location">{t('location')}</Label>
                          <div className="flex gap-2">
                            <Input 
                              id="edit-location" 
                              value={editParty.location} 
                              onChange={e => setEditParty({...editParty, location: e.target.value})} 
                              className="flex-1"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon" 
                              onClick={handleSearchLocation}
                              disabled={isSearchingLocation}
                            >
                              <MapPin size={16} className={isSearchingLocation ? 'animate-pulse' : ''} />
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-theme">{t('theme')}</Label>
                          <Select 
                            value={['Dinosauri', 'Spazio', 'Principesse', 'Supereroi', 'Mare', 'Safari'].includes(editParty.theme) ? editParty.theme : (editParty.theme ? 'custom' : '')} 
                            onValueChange={(value) => {
                              const defaultColor = themeDefaultColors[value] || '#000000';
                              if (value === 'custom') {
                                setEditParty({
                                  ...editParty, 
                                  theme: '',
                                  customThemeConfig: { ...editParty.customThemeConfig, textColor: defaultColor, backgroundColor: '#ffffff' }
                                });
                              } else {
                                setEditParty({
                                  ...editParty, 
                                  theme: value,
                                  customThemeConfig: { ...editParty.customThemeConfig, textColor: defaultColor }
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-full h-10">
                              <SelectValue placeholder={t('selectTheme')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dinosauri">{t('themeDinosaurs')}</SelectItem>
                              <SelectItem value="Spazio">{t('themeSpace')}</SelectItem>
                              <SelectItem value="Principesse">{t('themePrincesses')}</SelectItem>
                              <SelectItem value="Supereroi">{t('themeSuperheroes')}</SelectItem>
                              <SelectItem value="Mare">{t('themeSea')}</SelectItem>
                              <SelectItem value="Safari">{t('themeSafari')}</SelectItem>
                              <SelectItem value="custom">{t('themeCustom')}</SelectItem>
                            </SelectContent>
                          </Select>
                          {['Dinosauri', 'Spazio', 'Principesse', 'Supereroi', 'Mare', 'Safari'].includes(editParty.theme) ? (
                            <div className="mt-2">
                              <CustomThemeConfigEditor 
                                config={editParty.customThemeConfig} 
                                onChange={(config) => setEditParty({ ...editParty, customThemeConfig: config })} 
                              />
                            </div>
                          ) : (
                            <>
                              <Input 
                                placeholder={t('placeholderTheme')} 
                                value={editParty.theme}
                                onChange={e => setEditParty({...editParty, theme: e.target.value})}
                                className="mt-2"
                                autoFocus
                              />
                              <CustomThemeConfigEditor 
                                config={editParty.customThemeConfig} 
                                onChange={(config) => setEditParty({ ...editParty, customThemeConfig: config })} 
                              />
                            </>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-description">{t('description')}</Label>
                          <Textarea 
                            id="edit-description" 
                            value={editParty.description} 
                            onChange={e => setEditParty({...editParty, description: e.target.value})} 
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter className="relative z-10">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleSavePartyEdit} className="btn-primary" disabled={!editParty.title}>{t('saveChanges')}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                <Button 
                  onClick={handleShare} 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-current border-none relative"
                >
                  <Share2 size={18} className="mr-2" /> {t('share')}
                  {isCopied && (
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[var(--color-chocolate)] text-white text-[10px] px-2 py-1 rounded-md animate-bounce whitespace-nowrap">
                      {t('copied')}
                    </span>
                  )}
                </Button>

                <ShareDialog 
                  isOpen={isShareDialogOpen} 
                  onOpenChange={setIsShareDialogOpen} 
                  partyTitle={party.title} 
                  shareUrl={`${getPublicUrl()}/?partyId=${party.id}`}
                  theme={getThemeStyles(party.theme, party.customThemeConfig)}
                  inviteText={invitation}
                />
              </div>
            </div>
            <CardDescription className={cn("text-lg mt-4", party.theme?.toLowerCase().includes('spazio') ? 'text-blue-200' : 'text-slate-600')}>
              {party.date && !isNaN(new Date(party.date).getTime()) 
                ? format(new Date(party.date), 'EEEE d MMMM yyyy, HH:mm', { locale: dateLocales[language] })
                : t('tbd')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-2 opacity-80">
                <MapPin className="text-[var(--color-brand-primary)]" />
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(party.location.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-[var(--color-brand-primary)] transition-colors"
                  title={t('getDirections')}
                >
                  {party.location.address}
                </a>
              </div>
              {party.date && !isNaN(new Date(party.date).getTime()) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const startDate = new Date(party.date);
                    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
                    const formatGoogleDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');
                    const url = new URL('https://calendar.google.com/calendar/render');
                    url.searchParams.append('action', 'TEMPLATE');
                    url.searchParams.append('text', party.title);
                    url.searchParams.append('dates', `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`);
                    url.searchParams.append('details', party.description || '');
                    url.searchParams.append('location', party.location.address);
                    window.open(url.toString(), '_blank');
                  }}
                  className="bg-white/50 hover:bg-white/80 border-white/20 shadow-sm whitespace-nowrap w-fit"
                >
                  <CalendarIcon size={16} className="mr-2 text-[var(--color-brand-primary)]" />
                  {t('addToCalendar')}
                </Button>
              )}
            </div>
            <p className="leading-relaxed opacity-90">{party.description}</p>
          </CardContent>
        </Card>

        {isGuestMode ? (
          <div className="space-y-6">
            <Card className="birthday-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={20} className="text-[var(--color-brand-primary)]" />
                  {t('theInvite')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className={cn("p-6 rounded-xl border shadow-sm", getThemeStyles(party.theme, party.customThemeConfig))}
                  style={getCustomInlineStyles(party.theme, party.customThemeConfig)}
                >
                  {party.invitationImageUrl && (
                    <img 
                      src={party.invitationImageUrl} 
                      alt="Invito" 
                      className="w-full h-48 object-cover rounded-lg mb-4" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="whitespace-pre-wrap text-lg leading-relaxed font-medium italic">
                    {party.invitationText || t('inviteText')}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="birthday-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users size={20} className="text-[var(--color-brand-secondary)]" />
                  {t('rsvp')}
                </CardTitle>
                <CardDescription>{t('letUsKnow')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input 
                    placeholder={t('yourName')} 
                    value={newGuest.name} 
                    onChange={e => setNewGuest({...newGuest, name: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        if (!newGuest.name) return;
                        const guest: Guest = {
                          id: generateId(),
                          partyId: party.id,
                          name: newGuest.name,
                          email: '',
                          status: 'attending',
                          plusOnes: 0
                        };
                        saveGuest(guest);
                        setNewGuest({ name: '', email: '', phone: '' });
                      }} 
                      className="bg-green-500 hover:bg-green-600 text-white flex-1"
                    >
                      {t('illBeThere')}
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!newGuest.name) return;
                        const guest: Guest = {
                          id: generateId(),
                          partyId: party.id,
                          name: newGuest.name,
                          email: '',
                          status: 'declined',
                          plusOnes: 0
                        };
                        saveGuest(guest);
                        setNewGuest({ name: '', email: '', phone: '' });
                      }} 
                      variant="outline"
                      className="text-red-500 hover:bg-red-50 flex-1"
                    >
                      {t('cantMakeIt')}
                    </Button>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium text-sm text-slate-500 mb-2">{t('whoIsComing')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {guests.filter(g => g.status === 'attending').map(g => (
                      <Badge key={g.id} variant="secondary" className="bg-green-100 text-green-800">{g.name}</Badge>
                    ))}
                    {guests.filter(g => g.status === 'attending').length === 0 && (
                      <span className="text-sm text-slate-400">{t('noConfirmations')}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {gifts.length > 0 && (
              <Card className="birthday-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GiftIcon size={20} className="text-[var(--color-brand-accent)]" />
                    {t('giftIdeas')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gifts.map(gift => (
                      <div key={gift.id} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <p className="font-semibold text-[var(--color-chocolate)]">{gift.name}</p>
                        {gift.url && (
                          <a href={gift.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-brand-primary)] hover:underline">
                            {t('seeLink')}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Tabs defaultValue="invite" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-full p-1 bg-slate-100">
              <TabsTrigger value="invite" className="rounded-full">{t('aiInvite')}</TabsTrigger>
              <TabsTrigger value="guests" className="rounded-full">{t('guestsRsvp')}</TabsTrigger>
              <TabsTrigger value="gifts" className="rounded-full">{t('giftList')}</TabsTrigger>
            </TabsList>
          
          <TabsContent value="invite" className="mt-6">
            <Card className="birthday-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={20} className="text-[var(--color-brand-primary)]" />
                  {t('partyInvite')}
                </CardTitle>
                <CardDescription>{t('inviteDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('theme')}</Label>
                    <Select 
                      value={['Dinosauri', 'Spazio', 'Principesse', 'Supereroi', 'Mare', 'Safari'].includes(previewTheme) ? previewTheme : (previewTheme ? 'custom' : '')} 
                      onValueChange={(value) => {
                        const defaultColor = themeDefaultColors[value] || '#000000';
                        if (value === 'custom') {
                          setPreviewTheme('');
                          setPreviewCustomThemeConfig({ ...previewCustomThemeConfig, textColor: defaultColor, backgroundColor: '#ffffff' });
                        } else {
                          setPreviewTheme(value);
                          setPreviewCustomThemeConfig({ ...previewCustomThemeConfig, textColor: defaultColor });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full bg-slate-50">
                        <SelectValue placeholder={t('changeTheme')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dinosauri">{t('themeDinosaurs')}</SelectItem>
                        <SelectItem value="Spazio">{t('themeSpace')}</SelectItem>
                        <SelectItem value="Principesse">{t('themePrincesses')}</SelectItem>
                        <SelectItem value="Supereroi">{t('themeSuperheroes')}</SelectItem>
                        <SelectItem value="Mare">{t('themeSea')}</SelectItem>
                        <SelectItem value="Safari">{t('themeSafari')}</SelectItem>
                        <SelectItem value="custom">{t('themeCustom')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {!['Dinosauri', 'Spazio', 'Principesse', 'Supereroi', 'Mare', 'Safari', ''].includes(previewTheme) && (
                      <div className="mt-4">
                        <Input 
                          placeholder={t('placeholderTheme')} 
                          value={previewTheme}
                          onChange={e => setPreviewTheme(e.target.value)}
                          className="bg-white"
                        />
                        <CustomThemeConfigEditor 
                          config={previewCustomThemeConfig} 
                          onChange={setPreviewCustomThemeConfig} 
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('imageURL')}</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input 
                        placeholder="URL immagine..." 
                        value={invitationImageUrl} 
                        onChange={e => {
                          setInvitationImageUrl(e.target.value);
                          setImageError(false);
                        }}
                        className="bg-slate-50 flex-1"
                      />
                      <div className="flex gap-2">
                        <label className="cursor-pointer">
                          <Input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleInvitationImageUpload}
                          />
                          <div className="flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                            <Upload size={14} className="mr-1" />
                            {t('upload')}
                          </div>
                        </label>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            const randomId = Math.floor(Math.random() * 1000);
                            setInvitationImageUrl(`https://picsum.photos/seed/${randomId}/800/600`);
                            setImageError(false);
                          }}
                          className="text-xs"
                        >
                          {t('example')}
                        </Button>
                        {invitationImageUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setInvitationImageUrl('')}
                            className="text-slate-400 hover:text-red-500"
                          >
                            {t('reset')}
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">{t('useDirectLink')}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('customTheme')}</Label>
                  {['Dinosauri', 'Spazio', 'Principesse', 'Supereroi', 'Mare', 'Safari'].includes(previewTheme) ? (
                    <CustomThemeConfigEditor 
                      config={previewCustomThemeConfig} 
                      onChange={setPreviewCustomThemeConfig} 
                    />
                  ) : (
                    <>
                      <Input 
                        value={previewTheme === 'custom' ? '' : previewTheme} 
                        onChange={e => setPreviewTheme(e.target.value)} 
                        placeholder={t('placeholderTheme')}
                        className="bg-slate-50"
                      />
                      <CustomThemeConfigEditor 
                        config={previewCustomThemeConfig} 
                        onChange={setPreviewCustomThemeConfig} 
                      />
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('inviteTextLabel')}</Label>
                  <Textarea 
                    placeholder={t('placeholderInvite')} 
                    value={invitation} 
                    onChange={e => setInvitation(e.target.value)}
                    className="min-h-[150px] p-4 rounded-xl italic leading-relaxed focus-visible:ring-amber-200"
                    style={{
                      ...getCustomInlineStyles(previewTheme, previewCustomThemeConfig),
                      // Maintain some basic styling if no custom styles return something
                      backgroundColor: previewCustomThemeConfig?.backgroundColor || 'rgba(255, 251, 235, 0.3)',
                      borderColor: previewCustomThemeConfig?.textColor ? `${previewCustomThemeConfig.textColor}33` : 'rgba(245, 158, 11, 0.2)',
                    }}
                  />
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={handleGenerateInvite} 
                    disabled={isGenerating}
                    variant="outline"
                    className="flex-1 min-w-[140px] border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white"
                  >
                    <Sparkles size={16} className="mr-2" />
                    {isGenerating ? t('generating') : t('generateAI')}
                  </Button>
                  
                  <Button 
                    onClick={handleSaveInvitation}
                    className="flex-1 min-w-[140px] bg-[var(--color-brand-primary)] text-white"
                  >
                    {t('saveChanges')}
                  </Button>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 block">{t('livePreview')}</Label>
                  <div 
                    className={cn("relative p-6 rounded-2xl min-h-[300px] flex flex-col items-center text-center space-y-4 shadow-inner overflow-hidden transition-all duration-500", getThemeStyles(previewTheme, previewCustomThemeConfig))}
                    style={getCustomInlineStyles(previewTheme, previewCustomThemeConfig)}
                  >
                    <div 
                      className="absolute inset-0 opacity-10 pointer-events-none" 
                      style={{ 
                        backgroundImage: getThemePattern(previewTheme, previewCustomThemeConfig),
                        backgroundSize: previewCustomThemeConfig?.backgroundImageUrl ? 'cover' : '60px 60px',
                        backgroundPosition: 'center',
                        opacity: previewCustomThemeConfig?.backgroundImageUrl ? 0.3 : 0.4
                      }} 
                    />
                    
                    {invitationImageUrl && !imageError ? (
                      <img 
                        src={invitationImageUrl} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded-xl shadow-md relative z-10"
                        referrerPolicy="no-referrer"
                        onError={() => setImageError(true)}
                      />
                    ) : invitationImageUrl && imageError ? (
                      <div className="w-full h-32 bg-red-50 rounded-xl flex flex-col items-center justify-center relative z-10 border border-red-100 text-red-400">
                        <ImageIcon size={24} className="mb-1" />
                        <span className="text-[10px]">{t('invalidImage')}</span>
                      </div>
                    ) : null}
                    
                    <div className="relative z-10 space-y-2 w-full">
                      <h3 className="text-xl font-bold">{party.title}</h3>
                      <div className="whitespace-pre-wrap text-sm italic opacity-90">
                        {invitation || t('startWritingPreview')}
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger render={<Button variant="ghost" size="sm" className="relative z-10 mt-2 text-xs underline opacity-70 hover:opacity-100" />}>
                        {t('expandPreview')}
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                        <div 
                          className={cn("relative p-8 min-h-[500px] flex flex-col items-center text-center space-y-6 transition-colors duration-500", getThemeStyles(previewTheme, previewCustomThemeConfig))}
                          style={getCustomInlineStyles(previewTheme, previewCustomThemeConfig)}
                        >
                          <div 
                            className="absolute inset-0 opacity-20 pointer-events-none" 
                            style={{ 
                              backgroundImage: getThemePattern(previewTheme, previewCustomThemeConfig),
                              backgroundSize: previewCustomThemeConfig?.backgroundImageUrl ? 'cover' : '80px 80px',
                              backgroundPosition: 'center',
                              opacity: previewCustomThemeConfig?.backgroundImageUrl ? 0.4 : 0.5
                            }} 
                          />
                          
                          {invitationImageUrl && !imageError ? (
                            <img 
                              src={invitationImageUrl} 
                              alt="Invito" 
                              className="w-full h-64 object-cover rounded-2xl shadow-lg relative z-10"
                              referrerPolicy="no-referrer"
                              onError={() => setImageError(true)}
                            />
                          ) : (
                            <div className="w-full h-48 bg-white/20 rounded-2xl flex flex-col items-center justify-center relative z-10 border-2 border-dashed border-white/30 text-white/50">
                              <ImageIcon size={48} className="mb-2 opacity-30" />
                              <p className="text-sm">{imageError ? t('invalidImage') : t('noImage')}</p>
                            </div>
                          )}
                          
                          <div className="relative z-10 space-y-4 w-full">
                            <h2 className="text-3xl font-bold tracking-tight">{party.title}</h2>
                            <div className="h-1 w-20 bg-[var(--color-brand-primary)] mx-auto rounded-full opacity-50" />
                            <div className="whitespace-pre-wrap text-lg leading-relaxed font-medium italic">
                              {invitation || t('inviteMessageHere')}
                            </div>
                            
                            <div className="pt-6 space-y-2 text-sm opacity-80 border-t border-white/10">
                              <p className="flex items-center justify-center gap-2">
                                <CalendarIcon size={16} /> {party.date ? format(new Date(party.date), 'EEEE d MMMM, HH:mm', { locale: dateLocales[language] }) : t('tbd')}
                              </p>
                              <p className="flex items-center justify-center gap-2">
                                <MapPin size={16} /> 
                                <a 
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(party.location.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {party.location.address}
                                </a>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 relative z-10 w-full mt-4">
                            <Button 
                              className="flex-1 btn-primary"
                              onClick={(e) => {
                                const shareUrl = `${window.location.origin}${window.location.pathname}?partyId=${party.id}`;
                                const text = `🎉 *INVITO: ${party.title}* 🎉\n\n${invitation}\n\n📅 *Quando:* ${party.date ? format(new Date(party.date), 'dd/MM/yyyy HH:mm', { locale: dateLocales[language] }) : 'TBD'}\n📍 *Dove:* ${party.location.address}\n\n🔗 *${t('rsvp')}:* ${shareUrl}\n\n${invitationImageUrl ? `🖼️ *Immagine:* ${invitationImageUrl}` : ''}`;
                                navigator.clipboard.writeText(text);
                                const btn = e.currentTarget;
                                const originalText = btn.innerText;
                                btn.innerText = `Copiato! ✅`;
                                setTimeout(() => {
                                  btn.innerText = originalText;
                                }, 2000);
                              }}
                            >
                              {t('copyInvite')}
                            </Button>
                            <Button 
                              variant="secondary"
                              className="flex-1"
                              onClick={() => setIsShareDialogOpen(true)}
                            >
                              <Share2 size={18} className="mr-2" />
                              {t('share')}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guests" className="mt-6">
            <Card className="birthday-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-[var(--color-brand-secondary)]" />
                    {t('guestManagement')}
                  </div>
                  {'contacts' in navigator && (
                    <Button variant="outline" size="sm" onClick={handleSelectContact} className="text-xs">
                      <Contact size={14} className="mr-1" />
                      {t('addressBook')}
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  {t('addGuestsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input 
                    placeholder={t('name')} 
                    value={newGuest.name} 
                    onChange={e => setNewGuest({...newGuest, name: e.target.value})}
                  />
                  <Input 
                    placeholder={t('emailOptional')} 
                    value={newGuest.email} 
                    onChange={e => setNewGuest({...newGuest, email: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <Input 
                      placeholder={t('phoneOptional')} 
                      value={newGuest.phone} 
                      onChange={e => setNewGuest({...newGuest, phone: e.target.value})}
                    />
                    <Button onClick={handleAddGuest} className="bg-[var(--color-brand-secondary)] text-white rounded-lg px-3">
                      <Plus size={20} />
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  {guests.length === 0 ? (
                    <p className="text-center text-slate-400 py-10">{t('noGuestsAdded')}</p>
                  ) : (
                    <div className="space-y-4">
                      {guests.map(guest => (
                        <div key={guest.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-slate-100 shadow-sm gap-3">
                          <div className="flex flex-col">
                            <p className="font-medium">{guest.name}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className={
                                guest.status === 'attending' ? 'border-green-500 text-green-600' :
                                guest.status === 'declined' ? 'border-red-500 text-red-600' :
                                'border-slate-300 text-slate-400'
                              }>
                                {guest.status === 'attending' ? t('attending') : 
                                 guest.status === 'declined' ? t('declined') : t('pending')}
                              </Badge>
                              {guest.phone && <span className="text-[10px] text-slate-400 flex items-center gap-1"><MessageCircle size={10} /> {guest.phone}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1 border-r pr-2 mr-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-green-600 hover:bg-green-50"
                                title={t('sendWhatsapp')}
                                onClick={() => {
                                  const shareUrl = `${window.location.origin}${window.location.pathname}?partyId=${party.id}`;
                                  const text = encodeURIComponent(`${t('hi')} ${guest.name}! 🎉 ${t('invitedTo')} ${party.title}\n\n${invitation}\n\n📅 ${t('when')} ${party.date ? format(new Date(party.date), 'dd/MM/yyyy HH:mm', { locale: dateLocales[language] }) : 'TBD'}\n📍 ${t('where')} ${party.location.address}\n\n🔗 ${t('rsvp')}: ${shareUrl}`);
                                  const url = guest.phone 
                                    ? `https://wa.me/${guest.phone.replace(/\D/g, '')}?text=${text}`
                                    : `https://wa.me/?text=${text}`;
                                  window.open(url, '_blank');
                                }}
                              >
                                <MessageCircle size={16} />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-orange-500 hover:bg-orange-50"
                                title={t('eventReminder')}
                                onClick={() => {
                                  const shareUrl = `${window.location.origin}${window.location.pathname}?partyId=${party.id}`;
                                  const text = encodeURIComponent(`⏰ ${t('eventReminder')}! ⏰\n\n${t('hi')} ${guest.name}, ti ricordiamo che la festa "${party.title}" si terrà il ${party.date ? format(new Date(party.date), 'dd/MM/yyyy HH:mm', { locale: dateLocales[language] }) : 'TBD'} presso ${party.location.address}.\n\n🔗 ${t('rsvp')}: ${shareUrl}\n\nTi aspettiamo! 🎉`);
                                  const url = guest.phone 
                                    ? `https://wa.me/${guest.phone.replace(/\D/g, '')}?text=${text}`
                                    : `https://wa.me/?text=${text}`;
                                  window.open(url, '_blank');
                                }}
                              >
                                <CalendarIcon size={16} />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                title={t('sendEmail')}
                                onClick={() => {
                                  const shareUrl = `${window.location.origin}${window.location.pathname}?partyId=${party.id}`;
                                  const subject = encodeURIComponent(`${t('invite')}: ${party.title}`);
                                  const body = encodeURIComponent(`${t('hi')} ${guest.name}!\n\n${t('invitedTo')} ${party.title}\n\n${invitation}\n\n${t('when')} ${party.date ? format(new Date(party.date), 'dd/MM/yyyy HH:mm', { locale: dateLocales[language] }) : 'TBD'}\n${t('where')} ${party.location.address}\n\n${t('rsvp')}: ${shareUrl}`);
                                  const url = `mailto:${guest.email || ''}?subject=${subject}&body=${body}`;
                                  window.location.href = url;
                                }}
                              >
                                <Mail size={16} />
                              </Button>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => updateGuestStatus(guest.id, 'attending')}>{t('yes')}</Button>
                              <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => updateGuestStatus(guest.id, 'declined')}>{t('no')}</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gifts" className="mt-6">
            <Card className="birthday-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GiftIcon size={20} className="text-[var(--color-brand-accent)]" />
                  {t('giftList')}
                </CardTitle>
                <CardDescription>{t('suggestGifts')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input 
                    placeholder={t('whatDoesBirthdayKidWant')} 
                    value={newGift.name} 
                    onChange={e => setNewGift({...newGift, name: e.target.value})}
                  />
                  <Button onClick={handleAddGift} className="bg-[var(--color-brand-accent)] text-[var(--color-chocolate)] rounded-lg">{t('add')}</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gifts.map(gift => (
                    <div key={gift.id} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                      <p className="font-semibold text-[var(--color-chocolate)]">{gift.name}</p>
                      {gift.url && (
                        <a href={gift.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2">{t('seeExample')}</a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </div>

      <div className="space-y-8">
        <Card className="birthday-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('locationMap')}</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-[var(--color-brand-primary)] border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white"
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(party.location.address)}`, '_blank')}
            >
              <MapPin size={16} className="mr-2" />
              {t('getDirections')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 relative overflow-hidden">
               <iframe 
                 width="100%" 
                 height="100%" 
                 style={{ border: 0 }}
                 loading="lazy" 
                 allowFullScreen 
                 referrerPolicy="no-referrer-when-downgrade" 
                 src={`https://maps.google.com/maps?q=${encodeURIComponent(party.location.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
               ></iframe>
            </div>
          </CardContent>
        </Card>

        <Card className="birthday-card bg-[var(--color-brand-primary)]">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg text-emerald-300">{t('partyPhotos')}</CardTitle>
                <CardDescription className="text-emerald-400/80">{t('bestMoments')}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={handleShare} title={t('share')} className="text-emerald-300 hover:text-emerald-100 relative">
                <Share2 size={18} />
                {isCopied && (
                  <span className="absolute -top-8 right-0 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-md animate-bounce">
                    {t('copied')}
                  </span>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {party.photoUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img 
                    src={url} 
                    alt="Party" 
                    className="rounded-lg aspect-square object-cover border border-white/20 w-full" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = 'https://picsum.photos/seed/error/400/400?blur=2';
                      e.currentTarget.className += ' opacity-50';
                    }}
                  />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={async () => {
                      const updated = { ...party, photoUrls: party.photoUrls.filter((_, index) => index !== i) };
                      await saveParty(updated);
                    }}
                  >
                    <Plus className="rotate-45 h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input 
                placeholder={t('imageURL')} 
                value={newPhotoUrl} 
                onChange={e => setNewPhotoUrl(e.target.value)}
                className="bg-white/10 border-white/20 text-emerald-100 placeholder:text-emerald-300/50 flex-1"
              />
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePartyPhotoUpload}
                  />
                  <div className="flex h-9 items-center justify-center rounded-md border border-white/20 bg-white/10 px-3 text-xs font-medium text-emerald-100 shadow-sm hover:bg-white/20">
                    <Upload size={14} className="mr-1" />
                    {t('upload')}
                  </div>
                </label>
                <Button onClick={handleAddPhoto} variant="secondary" size="sm" className="bg-emerald-500 text-white hover:bg-emerald-600">{t('add')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
