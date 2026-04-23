import React from 'react';
import { Sparkles, PartyPopper, Cake, Gift, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLanguage } from '../lib/LanguageContext';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  const { t } = useLanguage();

  return (
    <div className={cn("flex items-center gap-2 select-none group focus:outline-none", className)}>
      <motion.div 
        className="relative h-24 md:h-38 lg:h-44 w-auto flex items-center justify-center p-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <img 
          src="/logo.png" 
          alt="FestaKids Logo" 
          className="h-full w-auto object-contain transition-transform duration-300"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if image not found during transition
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        
        {/* Abstract fallback if image fails to load */}
        <div className="hidden lg:block absolute -right-4 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
           <Sparkles className="text-amber-400 animate-pulse" size={16} />
        </div>
      </motion.div>

    </div>
  );
}
