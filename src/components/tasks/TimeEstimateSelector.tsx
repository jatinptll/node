import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils'; // wait, do I need cn? yes

export const formatEstimate = (mins?: number) => {
    if (!mins) return null;
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

interface TimeEstimateSelectorProps {
    value?: number;
    onChange: (mins?: number) => void;
}

export const TimeEstimateSelector = ({ value, onChange }: TimeEstimateSelectorProps) => {
    const [customValue, setCustomValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const presets = [15, 30, 60, 120, 240];

    const handleSelect = (mins: number) => {
        onChange(mins);
        setIsOpen(false);
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const mins = parseInt(customValue, 10);
        if (!isNaN(mins) && mins > 0) {
            handleSelect(mins);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    className={cn(
                        "flex border items-center gap-1.5 text-xs font-mono px-2 py-1 flex-shrink-0 rounded-md transition-colors",
                        value ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground border-transparent hover:surface-3 hover:text-foreground"
                    )}
                >
                    <Clock className="w-3.5 h-3.5" />
                    {value ? formatEstimate(value) : "Estimate"}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
                <div className="space-y-3">
                    <div className="text-xs font-mono text-muted-foreground uppercase">Time Estimate</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleSelect(0)} className="col-span-2 text-xs py-1.5 surface-2 hover:bg-destructive/10 hover:text-destructive rounded transition-colors">Clear</button>
                        {presets.map(mins => (
                            <button
                                key={mins}
                                onClick={() => handleSelect(mins)}
                                className={cn(
                                    "text-xs font-mono py-1.5 rounded transition-colors border",
                                    value === mins ? "bg-primary text-primary-foreground border-primary" : "surface-2 hover:surface-3 border-transparent"
                                )}
                            >
                                {formatEstimate(mins)}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleCustomSubmit} className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Custom mins"
                            value={customValue}
                            onChange={e => setCustomValue(e.target.value)}
                            className="flex-1 min-w-0 bg-transparent text-sm text-foreground border border-border rounded-md px-2 py-1 outline-none focus:border-primary/40"
                        />
                        <button type="submit" className="text-xs bg-primary text-primary-foreground px-2 rounded-md hover:bg-primary/90 transition-colors font-mono">Set</button>
                    </form>
                </div>
            </PopoverContent>
        </Popover>
    );
};
