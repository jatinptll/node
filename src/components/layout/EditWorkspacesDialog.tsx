import { useState } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';

export const EditWorkspacesDialog = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
  const { workspaces, updateWorkspace, addWorkspace, deleteWorkspace } = useTaskStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateWorkspace(id, { name: editName.trim() });
    toast.success('Workspace updated');
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    const isDuplicate = workspaces.some(w => w.name.toLowerCase() === newName.trim().toLowerCase());
    if (isDuplicate) {
      toast.error('Workspace already exists');
      return;
    }

    addWorkspace({
      id: `workspace-${Date.now()}`,
      name: newName.trim(),
      type: 'custom',
    });

    toast.success('Workspace added');
    setNewName('');
  };

  const handleDelete = (id: string, name: string) => {
    deleteWorkspace(id);
    toast.success(`${name} workspace deleted`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Workspaces</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
            {workspaces.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-2 rounded-lg border border-border surface-1 transition-colors hover:border-primary/50">
                {editingId === w.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-8 font-mono text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(w.id)}
                    />
                    <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleSaveEdit(w.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-mono font-medium text-sm flex-1">{w.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        setEditingId(w.id);
                        setEditName(w.name);
                      }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(w.id, w.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border flex items-center gap-2">
            <Input
              placeholder="New workspace..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="font-mono flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newName.trim()} className="gap-2 flex-shrink-0">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
