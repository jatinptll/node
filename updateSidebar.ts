import * as fs from 'fs';

const sidebarPath = './src/components/layout/Sidebar.tsx';
let content = fs.readFileSync(sidebarPath, 'utf8');

// Replace states
content = content.replace(
  /  const \[showAcademicMenu, setShowAcademicMenu\] = useState\(false\);\n  const menuRef = useRef<HTMLDivElement>\(null\);\n\n  const \[isPersonalOpen, setIsPersonalOpen\] = useState\(true\);\n  const \[isAcademicsOpen, setIsAcademicsOpen\] = useState\(true\);\n  const \[customOpenState, setCustomOpenState\] = useState<Record<string, boolean>>\(\{\}\);\n/,
  `  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [openWorkspaces, setOpenWorkspaces] = useState<Record<string, boolean>>({});\n`
);

// Replace outside click
content = content.replace(
  /  \/\/ Close menu on outside click\n  useEffect\(\(\) => \{\n    const handler = \(e: MouseEvent\) => \{\n      if \(menuRef\.current && !menuRef\.current\.contains\(e\.target as Node\)\) \{\n        setShowAcademicMenu\(false\);\n      \}\n    \};\n    if \(showAcademicMenu\) document\.addEventListener\('mousedown', handler\);\n    return \(\) => document\.removeEventListener\('mousedown', handler\);\n  \}, \[showAcademicMenu\]\);/,
  `  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.workspace-menu-container')) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeMenuId]);`
);


// We need to replace everything between `{/* Personal/Academic workspaces */}` and the end of `{/* Custom Workspaces */}` block
const wsStartComment = '{/* Personal/Academic workspaces */}';
const editWsComment = '{/* Edit Workspaces Instead of Sync */}';

const wsStartIndex = content.indexOf(wsStartComment);
const editWsIndex = content.indexOf(editWsComment);

if (wsStartIndex !== -1 && editWsIndex !== -1) {
  const replacement = `          ${wsStartComment}
          {!sidebarCollapsed && (
            <div className="flex flex-col gap-2 pt-2">
              {workspaces.map(w => {
                const wLists = lists.filter(l => l.workspaceId === w.id || (w.type === 'personal' && l.workspaceId === 'personal') || (w.type === 'academic' && l.workspaceId === 'academic'));
                const visibleLists = wLists.filter(l => !hiddenListIds.has(l.id));
                const hiddenCount = wLists.length - visibleLists.length;
                const isOpen = openWorkspaces[w.id] !== false; // open by default
                const isMenuOpen = activeMenuId === w.id;

                return (
                  <div key={w.id} className="mt-2">
                    <div className="px-4 flex items-center justify-between group">
                      <p 
                        className="text-xs font-mono text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors flex-1 cursor-pointer"
                        onClick={() => setOpenWorkspaces(prev => ({ ...prev, [w.id]: !isOpen }))}
                      >
                        {w.name}
                      </p>

                      <div className="flex items-center gap-2">
                        {wLists.length > 0 && (
                          <div className="relative workspace-menu-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : w.id);
                              }}
                              className="p-0.5 rounded hover:surface-3 text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit visible subjects"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            <AnimatePresence>
                              {isMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border surface-1 shadow-elevation-3 z-50 overflow-hidden"
                                >
                                  <div className="px-3 py-2 border-b border-border">
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                                      Show / Hide Items
                                    </p>
                                  </div>
                                  <div className="py-1 max-h-60 overflow-y-auto">
                                    {wLists.map((list) => {
                                      const isHidden = hiddenListIds.has(list.id);
                                      return (
                                        <button
                                          key={list.id}
                                          onClick={() => toggleListVisibility(list.id)}
                                          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:surface-3 transition-colors"
                                        >
                                          <div
                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: list.color, opacity: isHidden ? 0.3 : 1 }}
                                          />
                                          <span className={cn(
                                            "flex-1 text-left text-xs truncate",
                                            isHidden ? "text-muted-foreground line-through" : "text-foreground"
                                          )}>
                                            {list.name}
                                          </span>
                                          {isHidden ? (
                                            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                          ) : (
                                            <Eye className="w-3.5 h-3.5 text-primary" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        <div 
                          className="cursor-pointer flex items-center justify-center p-0.5"
                          onClick={() => setOpenWorkspaces(prev => ({ ...prev, [w.id]: !isOpen }))}
                        >
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-2 space-y-0.5 mt-1">
                            {visibleLists.length > 0 ? (
                              visibleLists.map((list) => {
                                const isActive = selectedListId === list.id;
                                const count = getUncompletedCount(list.id);
                                return (
                                  <button
                                    key={list.id}
                                    onClick={() => handleItemClick(list.id)}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                                      isActive ? "surface-2 text-foreground border-l-2 border-primary glow-sm" : "text-muted-foreground hover:surface-3 hover:text-foreground"
                                    )}
                                  >
                                    <div className="w-3 h-3 rounded-md flex-shrink-0" style={{ backgroundColor: list.color }} />
                                    <span className="flex-1 text-left truncate">{list.name}</span>
                                    {count > 0 && (
                                      <span className="min-w-[22px] h-[22px] flex items-center justify-center text-[11px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">{count}</span>
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <p className="text-[10px] text-muted-foreground pl-3 py-1 font-mono italic">
                                Empty workspace
                              </p>
                            )}
                            {hiddenCount > 0 && (
                              <p className="text-[10px] text-muted-foreground pl-3 py-1 font-mono">
                                {hiddenCount} item{hiddenCount !== 1 ? 's' : ''} hidden
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        ${editWsComment}`;

  const afterEditWsStr = content.substring(editWsIndex + editWsComment.length);
  content = content.substring(0, wsStartIndex) + replacement + afterEditWsStr;
}

// Clean up unused variables
content = content.replace("const personalLists = lists.filter(l => l.workspaceId === 'personal' || l.workspaceId === personalWorkspace?.id);\n  const academicLists = lists.filter(l => l.workspaceId === 'academic' || l.workspaceId === academicWorkspace?.id);\n  const visibleAcademicLists = academicLists.filter(l => !hiddenListIds.has(l.id));", "");
content = content.replace("const personalWorkspace = workspaces.find(w => w.type === 'personal');\n  const academicWorkspace = workspaces.find(w => w.type === 'academic');\n  const customWorkspaces = workspaces.filter(w => w.type === 'custom');", "");
content = content.replace("// Find the exact workspace name from the store\n  \n", "");

fs.writeFileSync(sidebarPath, content);
