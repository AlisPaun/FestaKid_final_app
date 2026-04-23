import React, { useState, useEffect } from 'react';
import { Plus, Calendar as CalendarIcon, MapPin, Gift as GiftIcon, Users, Sparkles, ChevronLeft, Trash2, Image as ImageIcon, Mail, MessageCircle, Share2, Contact, Edit2, Upload, Apple, Wifi, WifiOff, RefreshCw, CheckCircle2, X, Cake, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it, enGB, ro, fr } from 'date-fns/locale';
import confetti from 'canvas-confetti';

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
  
  // 1. If we are already on a shared preview site, use the current origin
  if (origin.includes('ais-pre-')) {
    return origin;
  }

  // 2. If we are in the dev editor preview, point specifically to the shared version
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }

  // 3. Fallback to configured APP_URL if it looks like a real domain or specific config
  const appUrl = process.env.VITE_APP_URL;
  if (appUrl && !appUrl.includes('ai.studio/apps') && !appUrl.includes('ais-dev-') && !appUrl.includes('ais-pre-')) {
    // Only use if it's not a generic technical run.app URL (which we already handle via origin)
    if (!appUrl.includes('.run.app')) {
      return appUrl.replace(/\/$/, '');
    }
  }

  // 4. Default to current origin
  return origin;
};

const SparkleTrail = () => {
  const [sparkles, setSparkles] = useState<{ id: string; x: number; y: number; color: string }[]>([]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const colors = ['#FFD93D', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FFF'];
      const newSparkle = {
        id: Math.random().toString(),
        x,
        y,
        color: colors[Math.floor(Math.random() * colors.length)]
      };

      setSparkles(prev => [...prev.slice(-15), newSparkle]);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchstart', handleMove);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchstart', handleMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {sparkles.map(s => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0.8, scale: 0.5, rotate: 0 }}
            animate={{ opacity: 0, scale: 0, rotate: 180, y: s.y + 40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              color: s.color,
              filter: 'drop-shadow(0 0 5px currentColor)',
            }}
          >
            <Sparkles size={10} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const getCountdownDisplay = (dateStr: string, t: any) => {
  if (!dateStr) return null;
  const partyDate = new Date(dateStr);
  if (isNaN(partyDate.getTime())) return null;

  // Special Easter Egg for the user's birthday!
  const isJune22 = partyDate.getMonth() === 5 && partyDate.getDate() === 22;

  const now = new Date();
  const diffTime = partyDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return isJune22 ? t('magicDay') : t('startsToday');
  }
  if (diffDays < 0) return t('eventFinished');
  return t('daysLeft').replace('%d', diffDays.toString());
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
    celebration: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.15' fill='%23000'%3E%3Cpath d='M10 10l5 2-2 5-5-2zM70 10l-5 2 2 5 5-2zM10 70l5-2-2-5-5 2zM70 70l-5-2 2-5 5 2z'/%3E%3Ccircle cx='40' cy='40' r='4'/%3E%3Cpath d='M40 20v5M40 60v5M20 40h5M60 40h5' stroke='%23000' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
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
  
  // Special celebration pattern for June 22
  return patterns.balloons;
};

const getThemePatternWithDate = (theme?: string, date?: string, customConfig?: any) => {
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime()) && d.getMonth() === 5 && d.getDate() === 22) {
      return `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg opacity='0.25' fill='%23000'%3E%3Cpath d='M10 10l5 2-2 5-5-2zM70 10l-5 2 2 5 5-2zM10 70l5-2-2-5-5 2zM70 70l-5-2 2-5 5 2z'/%3E%3Ccircle cx='40' cy='40' r='4'/%3E%3Cpath d='M40 20v5M40 60v5M20 40h5M60 40h5' stroke='%23000' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`;
    }
  }
  return getThemePattern(theme, customConfig);
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
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isCreatingParty, setIsCreatingParty] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  
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
    const handleRejection = (event: PromiseRejectionEvent) => {
      // Filter out benign Vite WebSocket errors that happen in this environment
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : (reason?.message || '');
      
      if (
        message.includes('WebSocket') || 
        message.includes('[vite]') ||
        message.includes('WS_CLOSED')
      ) {
        event.preventDefault();
        return;
      }
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || '';
      if (
        message.includes('WebSocket') || 
        message.includes('[vite]')
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);

    // Listen for PWA installability
    const handleInstallable = () => setIsInstallable(true);
    window.addEventListener('pwa-installable', handleInstallable);
    if ((window as any).deferredPrompt) setIsInstallable(true);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

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
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      if (!user) {
        setParties([]);
        setIsSyncing(false);
      }
      return;
    }

    const unsubscribe = subscribeToParties((data, metadata) => {
      setParties(data);
      
      // Use logical state transition to avoid dependency loop
      if (metadata.hasPendingWrites) {
        setIsSyncing(true);
      } else {
        setIsSyncing(prevState => {
          if (prevState) {
            setShowSyncSuccess(true);
            setTimeout(() => setShowSyncSuccess(false), 3000);
          }
          return false;
        });
      }
    });
    return () => unsubscribe();
  }, [authLoading, user]); // Removed isSyncing from dependencies

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  const handleInstallApp = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;
    
    // Show the install prompt
    promptEvent.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    (window as any).deferredPrompt = null;
    setIsInstallable(false);
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
    
    setIsCreatingParty(true);
    
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
    
    try {
      await saveParty(party);
      setIsCreateDialogOpen(false);
      setToast({ message: t('allChangesSaved'), type: 'success' });
      setNewParty({ 
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
      setError(null);
    } catch (err) {
      console.error("Error creating party:", err);
      setError(t('errorGeneric') || "Errore durante la creazione. Riprova.");
    } finally {
      setIsCreatingParty(false);
    }
  };

  const handleDeleteParty = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteParty(deleteConfirmId);
      setDeleteConfirmId(null);
      setToast({ message: t('allChangesSaved'), type: 'success' });
    }
  };

  const selectedParty = isGuestMode ? guestParty : parties.find(p => p.id === selectedPartyId);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FFD93D] via-[#FF6B6B] to-[#4ECDC4]">
      <SparkleTrail />
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-10 left-1/2 z-[500] px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3 backdrop-blur-xl border border-white/20",
              toast.type === 'success' ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
            )}
          >
            <div className="size-6 rounded-full bg-white/20 flex items-center justify-center">
              {toast.type === 'success' ? <CheckCircle2 size={14} /> : <X size={14} />}
            </div>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-red-100 border border-red-200 text-red-600 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 size={18} className="text-red-500 rotate-180" />
            <span>{error}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setError(null)}>
              <X size={14} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

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

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md !bg-white/90 !backdrop-blur-3xl border border-white/50 rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-800">{t('confirmDeleteTitle')}</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium py-2">
              {t('confirmDeleteDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="flex-1 rounded-2xl hover:bg-slate-100 transition-colors">
              {t('cancel')}
            </Button>
            <Button onClick={confirmDelete} variant="destructive" className="flex-1 rounded-2xl bg-red-500 hover:bg-red-600 font-bold shadow-lg shadow-red-500/20">
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {user && !selectedPartyId && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent 
            className={cn("sm:max-w-[425px] transition-colors duration-500 p-0 overflow-hidden max-h-[95vh] !bg-white/50 !backdrop-blur-3xl border border-white/40 shadow-2xl", getThemeStyles(newParty.theme, newParty.customThemeConfig))}
            style={getCustomInlineStyles(newParty.theme, newParty.customThemeConfig)}
          >
            <div 
              className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ 
                backgroundImage: getThemePatternWithDate(newParty.theme, newParty.date, newParty.customThemeConfig),
                backgroundSize: newParty.customThemeConfig?.backgroundImageUrl ? 'cover' : '20px 20px',
                backgroundPosition: newParty.customThemeConfig?.backgroundImageUrl ? 'center' : undefined,
                opacity: newParty.customThemeConfig?.backgroundImageUrl ? 0.3 : 0.1
              }} 
            />
            <ScrollArea className="max-h-[95vh]">
              <div className="px-6 py-6 space-y-6">
                <DialogHeader className="relative z-10">
                  <DialogTitle>{t('createEvent')}</DialogTitle>
                  <DialogDescription className={cn(newParty.theme?.toLowerCase().includes('spazio') ? 'text-blue-200' : 'text-slate-500')}>
                    {t('eventDetails')}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 relative z-10">
                  <div className="grid gap-2">
                    <Label htmlFor="new-party-title">{t('partyName')}</Label>
                    <Input 
                      id="new-party-title" 
                      value={newParty.title} 
                      onChange={e => setNewParty({...newParty, title: e.target.value})} 
                      placeholder={t('placeholderTitle')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-party-date">{t('dateAndTime')}</Label>
                    <Input 
                      id="new-party-date" 
                      type="datetime-local" 
                      value={newParty.date} 
                      onChange={e => setNewParty({...newParty, date: e.target.value})} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-party-location">{t('location')}</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="new-party-location" 
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
                            theme: newParty.theme || '', 
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
                <DialogFooter className="mt-6">
                  <Button 
                    onClick={handleCreateParty} 
                    className="btn-primary w-full"
                    disabled={!newParty.title || !newParty.date || isCreatingParty}
                  >
                    {isCreatingParty ? (
                      <RefreshCw size={18} className="animate-spin mr-2" />
                    ) : null}
                    {isCreatingParty ? t('creating') || 'Creating...' : t('create')}
                  </Button>
                </DialogFooter>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      <header className="shrink-0 flex items-center justify-between px-3 h-28 sm:h-36 md:h-48 sm:px-8 border-b border-white/10 bg-white/30 backdrop-blur-xl relative z-50">
        <div className="flex items-center gap-3 sm:gap-6">
          <div 
            className="cursor-pointer transition-transform hover:scale-105 active:scale-95" 
            onClick={() => { 
              setSelectedPartyId(null); 
              setIsGuestMode(false); 
              window.history.pushState({}, '', window.location.pathname);
            }}
          >
            <Logo />
          </div>
          <div className="h-6 lg:h-10 w-[1px] bg-slate-400/20 hidden lg:block" />
          <div className="flex-col hidden lg:flex">
            <span className="text-[12px] font-black text-slate-800 uppercase tracking-wide leading-tight">FestaKids</span>
            <p className="text-[13px] font-semibold text-slate-500 italic leading-none tracking-tight opacity-90">{t('appSubtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Birthday Special */}
          {new Date().getMonth() === 5 && new Date().getDate() === 22 && (
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="hidden md:flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full border border-amber-200 shadow-sm"
            >
              <Cake size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('magicDay')}</span>
            </motion.div>
          )}

          {/* Network Status */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-500 rounded-full border border-slate-200"
                title={t('offlineMode')}
              >
                <WifiOff size={12} className="sm:size-[14px]" />
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">{t('offlineMode')}</span>
              </motion.div>
            )}
            {isOnline && isSyncing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100"
              >
                <RefreshCw size={12} className="sm:size-[14px] animate-spin text-blue-400" />
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">{t('syncing')}</span>
              </motion.div>
            )}
            {isOnline && showSyncSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded-full border border-green-100"
              >
                <CheckCircle2 size={12} className="sm:size-[14px] text-green-500" />
                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider">{t('allChangesSaved')}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-6 w-[1px] bg-slate-200 mx-0.5 sm:mx-1 hidden lg:block" />

          {/* Utilities */}
          <div className="flex items-center gap-1.5">
            {isInstallable && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleInstallApp} 
                className="h-9 w-9 text-blue-600 bg-blue-50/80 border border-blue-100 hover:bg-blue-100 rounded-lg animate-pulse shadow-sm"
                title={t('installApp')}
              >
                <Download size={18} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsShareAppOpen(true)} className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg">
              <Share2 size={18} />
            </Button>
          </div>

          <div className="h-8 w-[1px] bg-slate-300/30 mx-1 sm:mx-2" />

          <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
            <SelectTrigger className="w-[62px] sm:w-[72px] h-9 sm:h-10 border border-slate-200/60 bg-white/60 hover:bg-white/90 focus:ring-2 focus:ring-blue-100 rounded-xl transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[90px]">
              <SelectItem value="it" className="py-2.5">🇮🇹 <span className="ml-2 hidden xs:inline">ITA</span></SelectItem>
              <SelectItem value="en" className="py-2.5">🇬🇧 <span className="ml-2 hidden xs:inline">ENG</span></SelectItem>
              <SelectItem value="ro" className="py-2.5">🇷🇴 <span className="ml-2 hidden xs:inline">RON</span></SelectItem>
              <SelectItem value="fr" className="py-2.5">🇫🇷 <span className="ml-2 hidden xs:inline">FRA</span></SelectItem>
            </SelectContent>
          </Select>

          {user && !selectedPartyId && (
            <Button 
              className="btn-primary flex items-center gap-2 w-auto h-9 sm:h-10 px-2 sm:px-6 justify-center"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{t('newParty')}</span>
            </Button>
          )}

          {user && (
            <Button variant="ghost" onClick={handleLogout} className="text-slate-500 hover:text-red-500 h-9 sm:h-10 px-1.5 sm:px-4">
              <LogOut size={18} />
              <span className="hidden sm:inline ml-2">{t('logout')}</span>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {authLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-brand-primary)]"></div>
            </div>
          ) : !user && !isGuestMode ? (
            <Card className="birthday-card text-center py-20 !bg-white/30 backdrop-blur-3xl border-white/40 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-200/10 via-transparent to-emerald-200/10 pointer-events-none" />
              <CardHeader className="relative z-10">
                <div className="w-28 h-28 bg-gradient-to-br from-[var(--color-brand-primary)] to-emerald-400 rounded-[2.5rem] flex items-center justify-center text-white mb-8 animate-bounce mx-auto shadow-xl shadow-emerald-900/20">
                  <Sparkles size={56} />
                </div>
                <CardTitle className="text-5xl font-black mb-4 text-[var(--color-brand-primary)] bg-clip-text text-transparent bg-gradient-to-r from-amber-600 via-emerald-600 to-rose-600 tracking-tight leading-tight">
                  {t('ctaTitle')}
                </CardTitle>
                <CardDescription className="text-xl text-[var(--color-chocolate)]/70 max-w-lg mx-auto font-medium">
                  {t('ctaSubtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex flex-col items-center space-y-6">
                  <Button onClick={handleLogin} className="btn-primary px-16 py-10 text-2xl rounded-3xl flex items-center gap-4 shadow-2xl hover:shadow-emerald-900/20 hover:-translate-y-2 active:scale-95 transition-all duration-500 border-b-4 border-emerald-800">
                    <LogIn size={32} />
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
                  <div className="col-span-full text-center py-20 bg-white/50 backdrop-blur-2xl rounded-3xl border-2 border-dashed border-white/40 flex flex-col items-center gap-6">
                    <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Plus size={40} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-slate-600">{t('noPartiesCreated')}</p>
                      <p className="text-slate-400 text-sm max-w-xs">{t('ctaSubtitle')}</p>
                    </div>
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-[var(--color-brand-primary)] text-white px-8 py-6 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Plus size={20} className="mr-2" />
                      {t('ctaButton')}
                    </Button>
                  </div>
                ) : (
                  parties.map(party => (
                    <Card 
                      key={party.id} 
                      className={cn("birthday-card cursor-pointer group relative overflow-hidden !bg-white/40 !backdrop-blur-xl border border-white/50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300", getThemeStyles(party.theme, party.customThemeConfig))}
                      style={getCustomInlineStyles(party.theme, party.customThemeConfig)}
                      onClick={() => setSelectedPartyId(party.id)}
                    >
                      <div 
                        className="absolute inset-0 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity duration-500" 
                        style={{ 
                          backgroundImage: getThemePatternWithDate(party.theme, party.date, party.customThemeConfig),
                          backgroundSize: party.customThemeConfig?.backgroundImageUrl ? 'cover' : '60px 60px',
                          backgroundPosition: party.customThemeConfig?.backgroundImageUrl ? 'center' : undefined,
                          opacity: party.customThemeConfig?.backgroundImageUrl ? 0.3 : 0.4
                        }} 
                      />
                      <CardHeader className="pb-2 relative z-10">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                             <Badge variant="secondary" className="bg-[var(--color-brand-accent)] text-[var(--color-chocolate)] shadow-sm font-bold">
                               {party.theme || t('generic')}
                             </Badge>
                             {getCountdownDisplay(party.date, t) && (
                               <Badge className="bg-white/50 text-[var(--color-brand-primary)] border-white/50 backdrop-blur-sm text-[10px] font-black uppercase tracking-tighter">
                                 {getCountdownDisplay(party.date, t)}
                               </Badge>
                             )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-full transition-colors"
                            onClick={(e) => handleDeleteParty(party.id, e)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        <CardTitle className="text-2xl mt-4 font-black text-[var(--color-chocolate)]">{party.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2 font-medium text-slate-500">
                          <div className="p-1 px-2 bg-white/50 rounded-lg flex items-center gap-1.5 border border-white/40">
                             <CalendarIcon size={14} className="text-[var(--color-brand-primary)]" />
                             <span className="text-xs">{party.date ? format(new Date(party.date), 'dd/MM/yyyy HH:mm', { locale: dateLocales[language] }) : t('addressNotSet')}</span>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="relative z-10 pt-2">
                        <div className="p-3 bg-white/30 rounded-xl border border-white/40 flex items-center gap-2">
                          <MapPin size={16} className="text-amber-500" />
                          <p className="text-xs font-semibold text-slate-600 truncate">
                             {party.location.address}
                          </p>
                        </div>
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
                
                {selectedParty && (
                  <PartyDetails 
                    party={selectedParty} 
                    onUpdate={refreshParties} 
                    isGuestMode={isGuestMode} 
                    setToast={setToast}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>

        {!selectedPartyId && !isGuestMode && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="birthday-card !bg-white/40 !backdrop-blur-xl border border-white/50 shadow-2xl p-6">
                <CardTitle className="text-sm font-bold mb-6 text-[var(--color-chocolate)] flex items-center gap-2">
                  <CalendarIcon size={18} className="text-[var(--color-brand-primary)]" />
                  {t('calendar')}
                </CardTitle>
                <div className="bg-white/40 rounded-2xl p-2 border border-white/20">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border-none shadow-none"
                  />
                </div>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="birthday-card !bg-[var(--color-brand-primary)]/10 !backdrop-blur-xl border border-[var(--color-brand-primary)]/20 shadow-2xl p-6 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:rotate-12 transition-all duration-700 pointer-events-none">
                  <Sparkles size={80} />
                </div>
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-6 text-[var(--color-brand-primary)] flex items-center gap-2">
                  <div className="size-2 rounded-full bg-[var(--color-brand-primary)] animate-pulse" />
                  {t('upcomingEvents')}
                </h3>
                <div className="space-y-3 relative z-10">
                  {parties.length === 0 ? (
                    <div className="py-8 px-4 text-center bg-white/20 rounded-2xl border-2 border-dashed border-[var(--color-brand-primary)]/20">
                      <p className="text-[10px] text-[var(--color-brand-primary)]/40 font-bold uppercase tracking-widest italic leading-relaxed">
                        {t('noPartiesCreated')}
                      </p>
                    </div>
                  ) : (
                    parties.slice(0, 3).map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => setSelectedPartyId(p.id)}
                        className="bg-white/40 hover:bg-white/60 p-3 rounded-2xl border border-white/40 shadow-sm transition-all cursor-pointer group/item flex items-center justify-between hover:translate-x-1"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-xs text-[var(--color-chocolate)] group-hover/item:text-[var(--color-brand-primary)] transition-colors truncate">{p.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[var(--color-brand-primary)] font-bold">
                              {p.date && !isNaN(new Date(p.date).getTime()) 
                                ? format(new Date(p.date), 'dd MMM', { locale: dateLocales[language] }) 
                                : t('tbd')}
                            </span>
                          </div>
                        </div>
                        <div className="size-6 rounded-full bg-white/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                           <ChevronLeft size={12} className="rotate-180 text-[var(--color-brand-primary)]" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        )}
          </div>
        </div>
      </main>

      <footer className="mt-auto py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-8">
          {!selectedPartyId && !isGuestMode && user && (
            <div className="w-full bg-white/20 backdrop-blur-lg rounded-3xl p-8 text-center border border-white/30 shadow-xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-rose-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative z-10">
                <Sparkles className="mx-auto mb-4 text-amber-200 animate-pulse" size={40} />
                <h2 className="text-3xl font-bold text-white mb-2">{t('ctaTitle')}</h2>
                <p className="text-white/80 mb-6 max-w-md mx-auto">{t('ctaSubtitle')}</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)} 
                  className="bg-white text-[var(--color-brand-primary)] hover:bg-slate-50 px-8 py-6 rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  {t('ctaButton')}
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Logo className="h-4 w-auto opacity-50" />
              <span>© {new Date().getFullYear()} FestaKids</span>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => setIsFeedbackOpen(true)}
              className="group flex flex-col items-center gap-1 h-auto py-4 px-6 text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
            >
              <span className="text-sm font-medium opacity-70 group-hover:opacity-100">{t('feedbackQuestion')}</span>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10 group-hover:bg-white/20">
                <MessageCircle size={18} className="text-amber-300" />
                <span className="font-bold">{t('feedback')}</span>
              </div>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PartyDetails({ 
  party: initialParty, 
  onUpdate, 
  isGuestMode,
  setToast
}: { 
  party: Party, 
  onUpdate: () => void, 
  isGuestMode?: boolean,
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void
}) {
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
    setToast({ message: t('allChangesSaved'), type: 'success' });
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
    setToast({ message: t('allChangesSaved'), type: 'success' });
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
    setToast({ message: t('allChangesSaved'), type: 'success' });
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
    setToast({ message: t('allChangesSaved'), type: 'success' });
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
      console.warn(t('contactNotSupported'));
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
    setToast({ message: t('allChangesSaved'), type: 'success' });
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
              backgroundImage: getThemePatternWithDate(party.theme, party.date, party.customThemeConfig),
              backgroundSize: party.customThemeConfig?.backgroundImageUrl ? 'cover' : '24px 24px',
              backgroundPosition: 'center',
              opacity: party.customThemeConfig?.backgroundImageUrl ? 0.4 : 0.2
            }} 
          />
          <CardHeader className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <CardTitle className="text-3xl font-black">{party.title}</CardTitle>
                   {getCountdownDisplay(party.date, t) && (
                      <Badge className="bg-amber-400 text-amber-900 shadow-lg border-2 border-amber-300 animate-pulse font-black px-3 py-1 rounded-full text-xs">
                        {getCountdownDisplay(party.date, t)}
                      </Badge>
                   )}
                </div>
                <Badge className="bg-[var(--color-brand-secondary)] text-white font-bold">{party.theme}</Badge>
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
                          backgroundImage: getThemePatternWithDate(editParty.theme, editParty.date, editParty.customThemeConfig),
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
                        
                        // Confetti Celebration!
                        confetti({
                          particleCount: 150,
                          spread: 70,
                          origin: { y: 0.6 },
                          colors: ['#FFD93D', '#FF6B6B', '#4ECDC4', '#00674F']
                        });

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
                      className="bg-green-500 hover:bg-green-600 text-white flex-1 font-bold shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                    >
                      <Sparkles size={16} className="mr-2" />
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
                  <h4 className="font-medium text-sm text-slate-500 mb-2">
                    {t('whoIsComing')} ({guests.filter(g => g.status === 'attending').length})
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {guests.filter(g => g.status === 'attending').map(g => (
                      <Badge key={g.id} variant="secondary" className="bg-green-100 text-green-800 border-green-200 py-1 h-auto text-sm">{g.name}</Badge>
                    ))}
                    {guests.filter(g => g.status === 'attending').length === 0 && (
                      <span className="text-sm text-slate-400 italic">{t('noConfirmations')}</span>
                    )}
                  </div>

                  {guests.filter(g => g.status === 'pending').length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <h4 className="font-medium text-[10px] text-slate-400 uppercase tracking-widest mb-2">{t('pendingGuests')}</h4>
                      <div className="flex flex-wrap gap-2 opacity-70">
                        {guests.filter(g => g.status === 'pending').map(g => (
                          <Badge key={g.id} variant="outline" className="text-slate-500 border-slate-200 font-normal">{g.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
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
                      <div key={gift.id} className="p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm flex justify-between items-center group/gift hover:bg-white/60 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                            <GiftIcon size={20} />
                          </div>
                          <p className="font-bold text-[var(--color-chocolate)]">{gift.name}</p>
                        </div>
                        {gift.url && (
                          <a 
                            href={gift.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-brand-primary)] text-white text-xs font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-900/10"
                          >
                            <Share2 size={12} />
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
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1 bg-white/20 backdrop-blur-md border border-white/30 shadow-lg mb-8">
              <TabsTrigger value="invite" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[var(--color-brand-primary)] data-[state=active]:shadow-md transition-all font-bold py-3">{t('aiInvite')}</TabsTrigger>
              <TabsTrigger value="guests" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[var(--color-brand-primary)] data-[state=active]:shadow-md transition-all font-bold py-3">{t('guestsRsvp')}</TabsTrigger>
              <TabsTrigger value="gifts" className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-[var(--color-brand-primary)] data-[state=active]:shadow-md transition-all font-bold py-3">{t('giftList')}</TabsTrigger>
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
                        backgroundImage: getThemePatternWithDate(previewTheme, party.date, previewCustomThemeConfig),
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
                              backgroundImage: getThemePatternWithDate(previewTheme, party.date, previewCustomThemeConfig),
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
                                const shareUrl = `${getPublicUrl()}?partyId=${party.id}`;
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
                
                <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-slate-50/50">
                  {guests.length === 0 ? (
                    <p className="text-center text-slate-400 py-10">{t('noGuestsAdded')}</p>
                  ) : (
                    <div className="space-y-4">
                      {guests.map(guest => (
                        <div key={guest.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm gap-4 group/guest hover:bg-white/60 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={cn("size-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner", 
                              guest.status === 'attending' ? "bg-green-100 text-green-600" : 
                              guest.status === 'declined' ? "bg-red-100 text-red-600" : 
                              "bg-slate-100 text-slate-400"
                            )}>
                              {guest.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                               <p className="font-bold text-[var(--color-chocolate)]">{guest.name}</p>
                               <div className="flex flex-wrap items-center gap-2 mt-1">
                                 <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-4 border-none font-bold uppercase tracking-wider",
                                    guest.status === 'attending' ? "bg-green-500/10 text-green-600" : 
                                    guest.status === 'declined' ? "bg-red-500/10 text-red-600" : 
                                    "bg-slate-500/10 text-slate-500"
                                 )}>
                                   {guest.status === 'attending' ? t('attending') : 
                                    guest.status === 'declined' ? t('declined') : t('pending')}
                                 </Badge>
                                 {guest.phone && <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><MessageCircle size={10} /> {guest.phone}</span>}
                                 {guest.plusOnes > 0 && <span className="text-[10px] text-slate-400 font-medium tracking-tight">+{guest.plusOnes}</span>}
                               </div>
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
                                  const shareUrl = `${getPublicUrl()}?partyId=${party.id}`;
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
                                  const shareUrl = `${getPublicUrl()}?partyId=${party.id}`;
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
                                  const shareUrl = `${getPublicUrl()}?partyId=${party.id}`;
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
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {party.photoUrls.map((url, i) => (
                <motion.div 
                  key={url} 
                  initial={{ opacity: 0, rotate: i % 2 === 0 ? -5 : 5, scale: 0.9 }}
                  animate={{ opacity: 1, rotate: i % 2 === 0 ? -3 : 3, scale: 1 }}
                  whileHover={{ rotate: 0, scale: 1.05, zIndex: 50 }}
                  className="relative group bg-white p-3 pb-10 shadow-xl border border-slate-200"
                >
                  <img 
                    src={url} 
                    alt="Party" 
                    className="aspect-square object-cover w-full border border-slate-100" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = 'https://picsum.photos/seed/error/400/400?blur=2';
                      e.currentTarget.className += ' opacity-50';
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 py-3 text-center">
                    <p className="font-handwriting text-slate-400 text-[10px]">Moments #{i + 1}</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-lg"
                    onClick={async () => {
                      const updated = { ...party, photoUrls: party.photoUrls.filter((_, index) => index !== i) };
                      await saveParty(updated);
                    }}
                  >
                    <Plus className="rotate-45 h-4 w-4" />
                  </Button>
                </motion.div>
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
