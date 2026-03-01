import { useState } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';

import { SUBJECT_COLORS } from '@/lib/constants';

export const EditWorkspacesDialog = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
  const { workspaces, lists, updateWorkspace, addWorkspace, deleteWorkspace, addList, deleteList, updateList } = useTaskStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState('');

  const [newName, setNewName] = useState('');
  const [newListPage, setNewListPage] = useState<Record<string, string>>({});

  const handleSaveEditList = (id: string) => {
    if (!editListName.trim()) return;
    updateList(id, { name: editListName.trim() });
    toast.success('Page updated');
    setEditingListId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateWorkspace(id, { name: editName.trim() });
    toast.success('Workspace updated');
    setEditingId(null);
  };

  const handleAddWorkspace = () => {
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

  const handleDeleteWorkspace = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the domain "${name}" and ALL its pages? This action cannot be undone.`)) {
      deleteWorkspace(id);
      toast.success(`${name} workspace deleted`);
    }
  };

  const handleAddList = (workspaceId: string, workspaceType: string) => {
    const pageName = (newListPage[workspaceId] || '').trim();
    if (!pageName) return;

    // The actual workspaceId for list (to keep legacy personal/academics mappings)
    const targetWorkspaceId = workspaceType === 'personal' ? 'personal' : (workspaceType === 'academic' ? 'academic' : workspaceId);

    const randomColor = SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)];
    addList({
      id: `list-${Date.now()}`,
      workspaceId: targetWorkspaceId,
      name: pageName,
      color: randomColor,
      sortOrder: lists.filter(l => l.workspaceId === targetWorkspaceId).length,
    });

    toast.success('Page added');
    setNewListPage({ ...newListPage, [workspaceId]: '' });
  };

  const handleDeleteList = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the page "${name}"? This action cannot be undone.`)) {
      deleteList(id);
      toast.success(`${name} page deleted`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Workspaces & Pages</DialogTitle>
        </DialogHeader>
        <div className="py-2 flex-1 overflow-y-auto pr-2 space-y-4">
          <div className="space-y-4">
            {workspaces.map((w: any) => {
              const wLists = lists.filter(l => l.workspaceId === w.id || (w.type === 'personal' && l.workspaceId === 'personal') || (w.type === 'academic' && l.workspaceId === 'academic'));

              return (
                <div key={w.id} className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg border border-border surface-1 transition-colors hover:border-primary/50">
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteWorkspace(w.id, w.name)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Pages for this workspace */}
                  <div className="pl-6 space-y-1">
                    {wLists.map(list => (
                      <div key={list.id} className="flex items-center justify-between p-1.5 rounded-lg border border-transparent hover:surface-2 group">
                        {editingListId === list.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editListName}
                              onChange={e => setEditListName(e.target.value)}
                              className="h-7 text-xs font-mono"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditList(list.id)}
                            />
                            <Button size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleSaveEditList(list.id)}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                              <span className="text-xs text-muted-foreground">{list.name}</span>
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                setEditingListId(list.id);
                                setEditListName(list.name);
                              }}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteList(list.id, list.name)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder={`Add page to ${w.name}...`}
                        className="h-7 text-xs bg-transparent"
                        value={newListPage[w.id] || ''}
                        onChange={e => setNewListPage({ ...newListPage, [w.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAddList(w.id, w.type)}
                      />
                      <Button size="icon" variant="secondary" className="h-7 w-7 flex-shrink-0" onClick={() => handleAddList(w.id, w.type)} disabled={!newListPage[w.id]?.trim()}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center gap-2 mt-4">
          <Input
            placeholder="New workspace domain..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="font-mono flex-1 h-9"
            onKeyDown={(e) => e.key === 'Enter' && handleAddWorkspace()}
          />
          <Button onClick={handleAddWorkspace} disabled={!newName.trim()} className="gap-2 flex-shrink-0 h-9">
            <Plus className="w-4 h-4" /> Add Domain
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
