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
    <div className={cn("flex items-center gap-4 select-none group focus:outline-none", className)}>
      <div className="relative w-14 h-14 flex items-center justify-center">
        {/* Abstract Celebration Grid */}
        <motion.div 
          className="grid grid-cols-2 gap-1.5 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm transition-transform duration-500 group-hover:scale-110"
          initial={{ rotate: -5 }}
          whileHover={{ rotate: 0 }}
        >
          <motion.div 
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-5 bg-[#FF6B6B] rounded-full flex items-center justify-center p-1 shadow-sm"
          >
            <Star className="w-full h-full text-white fill-current" />
          </motion.div>
          
          <motion.div 
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="w-5 h-5 bg-[#FFD93D] rounded-lg flex items-center justify-center p-1 shadow-sm"
          >
            <Gift className="w-full h-full text-white" />
          </motion.div>
          
          <motion.div 
            animate={{ x: [0, 2, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="w-5 h-5 bg-[#4ECDC4] rounded-lg flex items-center justify-center p-1 shadow-sm"
          >
            <Cake className="w-full h-full text-white" />
          </motion.div>
          
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="w-5 h-5 bg-[#45B7D1] rounded-full flex items-center justify-center p-1 shadow-sm"
          >
            <PartyPopper className="w-full h-full text-white" />
          </motion.div>
        </motion.div>
        
        {/* Floating Sparkles */}
        <motion.div
          animate={{ 
            opacity: [0, 1, 0], 
            scale: [0.5, 1, 0.5], 
            x: [0, 12, 0], 
            y: [0, -12, 0] 
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1 -right-1 text-[#FFD93D]"
        >
          <Sparkles size={16} fill="currentColor" />
        </motion.div>
        
        <motion.div
          animate={{ 
            opacity: [0, 1, 0], 
            scale: [0.4, 0.9, 0.4], 
            x: [0, -8, 0], 
            y: [0, 8, 0] 
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-1 -left-1 text-[#4ECDC4]"
        >
          <Sparkles size={12} fill="currentColor" />
        </motion.div>
      </div>

      <div className="flex flex-col">
        <h1 className="text-3xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-br from-[#3D2B1F] via-[#5C4033] to-[#3D2B1F] group-hover:tracking-tight transition-all duration-300">
          Festa<span className="text-[#FF6B6B] relative">Kid
            <motion.span 
              className="absolute -top-1 -right-3 block w-2 h-2 bg-[#FFD93D] rounded-full"
              animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </span>
        </h1>
        <div className="flex items-center gap-2 mt-1 translate-x-1">
          <div className="h-[1px] w-4 bg-slate-200" />
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">
            {t('appTagline')}
          </span>
          <div className="h-[1px] w-4 bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
