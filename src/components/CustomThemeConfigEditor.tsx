import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Palette } from 'lucide-react';
import { compressImage } from '../lib/imageUtils';
import { useLanguage } from '../lib/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomThemeConfig {
  backgroundColor?: string;
  textColor?: string;
  backgroundImageUrl?: string;
  backgroundPattern?: string;
}

interface Props {
  config: CustomThemeConfig;
  onChange: (config: CustomThemeConfig) => void;
}

export function CustomThemeConfigEditor({ config, onChange }: Props) {
  const { t } = useLanguage();

  if (!config) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      onChange({ ...config, backgroundImageUrl: base64, backgroundPattern: '' });
    } catch (err) {
      console.error("Error compressing image:", err);
    }
  };

  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg bg-slate-50/50">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">{t('backgroundColor')}</Label>
          <div className="flex gap-2">
            <Input 
              type="color" 
              value={config.backgroundColor || '#ffffff'} 
              onChange={e => onChange({ ...config, backgroundColor: e.target.value })}
              className="w-12 h-8 p-1 cursor-pointer"
            />
            <Input 
              type="text" 
              value={config.backgroundColor || '#ffffff'} 
              onChange={e => onChange({ ...config, backgroundColor: e.target.value })}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">{t('textColor')}</Label>
          <div className="flex gap-2">
            <Input 
              type="color" 
              value={config.textColor || '#000000'} 
              onChange={e => onChange({ ...config, textColor: e.target.value })}
              className="w-12 h-8 p-1 cursor-pointer"
            />
            <Input 
              type="text" 
              value={config.textColor || '#000000'} 
              onChange={e => onChange({ ...config, textColor: e.target.value })}
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t('bgPattern')}</Label>
        <Select 
          value={config.backgroundPattern || 'balloons'} 
          onValueChange={val => onChange({ ...config, backgroundPattern: val, backgroundImageUrl: '' })}
        >
          <SelectTrigger className="h-8 text-xs bg-white">
            <div className="flex items-center gap-2">
              <Palette size={14} className="text-slate-400" />
              <SelectValue placeholder={t('bgPattern')} />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('patternNone')}</SelectItem>
            <SelectItem value="balloons">{t('patternBalloons')}</SelectItem>
            <SelectItem value="stars">{t('patternStars')}</SelectItem>
            <SelectItem value="hearts">{t('patternHearts')}</SelectItem>
            <SelectItem value="paws">{t('patternPaws')}</SelectItem>
            <SelectItem value="waves">{t('patternWaves')}</SelectItem>
            <SelectItem value="dino">{t('themeDinosaurs')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t('bgImage')} ({t('example').toLowerCase().includes('ex') ? 'Optional' : 'Opzionale'})</Label>
        <div className="flex gap-2">
          <label className="cursor-pointer flex-1">
            <Input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
            <div className="flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
              <Upload size={14} className="mr-1" />
              {t('upload')}
            </div>
          </label>
          {config.backgroundImageUrl && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onChange({ ...config, backgroundImageUrl: '' })}
              className="h-8 text-slate-400 hover:text-red-500"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
