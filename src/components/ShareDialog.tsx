import React, { useState } from 'react';
import { Share2, Mail, MessageCircle, Copy, Check, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../lib/LanguageContext';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  partyTitle: string;
  shareUrl: string;
  theme?: string;
  inviteText?: string;
}

export function ShareDialog({ isOpen, onOpenChange, partyTitle, shareUrl, theme, inviteText }: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Fallback share text if no invitation text is provided
  const baseShareText = inviteText || `${t('whatsappMessage')} ${partyTitle}`;
  const fullMessage = `${baseShareText}\n\n${shareUrl}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareInstagram = () => {
    // Instagram doesn't have a direct share URL for web. Copying link is the standard fallback.
    copyToClipboard();
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(partyTitle)}&body=${encodeURIComponent(fullMessage)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[450px]", theme)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={20} className="text-[var(--color-brand-primary)]" />
            {t('shareTitle')}
          </DialogTitle>
          <DialogDescription>
            {partyTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
          <Button 
            variant="outline" 
            className="flex flex-col h-20 gap-1 border-green-100 hover:border-green-500 hover:bg-green-50 group transition-all"
            onClick={shareWhatsApp}
          >
            <div className="p-1.5 rounded-full bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <MessageCircle size={20} />
            </div>
            <span className="text-[10px] font-medium">{t('shareViaWhatsApp')}</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col h-20 gap-1 border-blue-100 hover:border-blue-600 hover:bg-blue-50 group transition-all"
            onClick={shareFacebook}
          >
            <div className="p-1.5 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Facebook size={20} />
            </div>
            <span className="text-[10px] font-medium">{t('shareViaFacebook')}</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col h-20 gap-1 border-pink-100 hover:border-pink-600 hover:bg-pink-50 group transition-all"
            onClick={shareInstagram}
          >
            <div className="p-1.5 rounded-full bg-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-colors">
              <Instagram size={20} />
            </div>
            <span className="text-[10px] font-medium">{copied ? t('copied') : t('shareViaInstagram')}</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col h-20 gap-1 border-sky-100 hover:border-sky-600 hover:bg-sky-50 group transition-all"
            onClick={shareLinkedIn}
          >
            <div className="p-1.5 rounded-full bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Linkedin size={20} />
            </div>
            <span className="text-[10px] font-medium">{t('shareViaLinkedIn')}</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col h-20 gap-1 border-slate-100 hover:border-slate-500 hover:bg-slate-50 group transition-all"
            onClick={shareEmail}
          >
            <div className="p-1.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <Mail size={20} />
            </div>
            <span className="text-[10px] font-medium">{t('shareViaEmail')}</span>
          </Button>

          <Button 
            variant="outline" 
            className="flex flex-col h-20 gap-1 border-purple-100 hover:border-purple-500 hover:bg-purple-50 group transition-all"
            onClick={copyToClipboard}
          >
            <div className={cn(
              "p-1.5 rounded-full transition-colors",
              copied ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white"
            )}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </div>
            <span className="text-[10px] font-medium">{copied ? t('copied') : t('copyLink')}</span>
          </Button>
        </div>

        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-wider">{t('copyLink')}</p>
          <div className="flex gap-2 items-center">
            <input 
              readOnly 
              value={shareUrl} 
              className="bg-transparent text-xs text-slate-600 flex-1 outline-none font-mono truncate"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyToClipboard}>
              <Copy size={14} className="text-slate-400" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
