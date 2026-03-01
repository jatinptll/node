import { useState, useEffect } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoalTimeframe } from '@/types/task';

interface GoalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    goalId?: string;
}

export const GoalDialog = ({ open, onOpenChange, goalId }: GoalDialogProps) => {
    const { goals, addGoal, updateGoal } = useTaskStore();
    const existingGoal = goalId ? goals.find(g => g.id === goalId) : undefined;

    const [title, setTitle] = useState(existingGoal?.title || '');
    const [timeframe, setTimeframe] = useState<GoalTimeframe>(existingGoal?.timeframe || 'monthly');
    const [targetDate, setTargetDate] = useState(existingGoal?.targetDate || '');

    // Sync form fields when the dialog opens or goalId changes
    useEffect(() => {
        if (open) {
            setTitle(existingGoal?.title || '');
            setTimeframe(existingGoal?.timeframe || 'monthly');
            setTargetDate(existingGoal?.targetDate || '');
        }
    }, [open, goalId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        if (existingGoal) {
            updateGoal(existingGoal.id, {
                title: title.trim(),
                timeframe,
                targetDate: targetDate || undefined,
            });
        } else {
            addGoal({
                id: crypto.randomUUID(),
                title: title.trim(),
                timeframe,
                targetDate: targetDate || undefined,
                sortOrder: goals.length,
            });
        }

        onOpenChange(false);
        resetForm();
    };

    const resetForm = () => {
        if (!existingGoal) {
            setTitle('');
            setTimeframe('monthly');
            setTargetDate('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-mono">{existingGoal ? 'Edit Goal' : 'Create Goal'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="font-mono text-xs">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="E.g., Launch MVP"
                            className="font-mono text-sm"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="timeframe" className="font-mono text-xs">Timeframe</Label>
                        <Select value={timeframe} onValueChange={(v) => setTimeframe(v as GoalTimeframe)}>
                            <SelectTrigger id="timeframe">
                                <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="targetDate" className="font-mono text-xs">Target Date (Optional)</Label>
                        <Input
                            id="targetDate"
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-mono text-xs">
                            Cancel
                        </Button>
                        <Button type="submit" className="font-mono text-xs">
                            {existingGoal ? 'Save' : 'Create Goal'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
