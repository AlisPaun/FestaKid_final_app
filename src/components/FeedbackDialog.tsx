import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '../lib/LanguageContext';
import { saveFeedback } from '../lib/db';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ isOpen, onOpenChange }: Props) {
  const { t } = useLanguage();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    try {
      await saveFeedback({
        id: crypto.randomUUID(),
        text: feedback,
        userId: auth.currentUser?.uid,
        createdAt: new Date().toISOString(),
      });
      setIsSuccess(true);
      setFeedback('');
      setTimeout(() => {
        setIsSuccess(false);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-600" />
            {t('feedbackQuestion')}
          </DialogTitle>
          <DialogDescription>
            {t('feedbackPlaceholder')}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid gap-4 py-4"
            >
              <Textarea 
                placeholder={t('feedbackPlaceholder')}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[120px] bg-slate-50/50"
              />
              <DialogFooter>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !feedback.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Send size={18} />
                    </motion.div>
                  ) : (
                    <Send size={18} />
                  )}
                  {t('sendFeedback')}
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} />
              </div>
              <p className="font-medium text-slate-900">{t('feedbackSuccess')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
