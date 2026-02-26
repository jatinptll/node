import type { EnergyTag } from '@/types/task';

export const ENERGY_TAGS: { value: EnergyTag; label: string; emoji: string; color: string }[] = [
    { value: 'deep_focus', label: 'Deep Focus', emoji: '🧠', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    { value: 'quick_win', label: 'Quick Win', emoji: '⚡', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    { value: 'comms', label: 'Comms', emoji: '📞', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { value: 'routine', label: 'Routine', emoji: '🔄', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
];
