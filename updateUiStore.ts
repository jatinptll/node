import * as fs from 'fs';

const filePath = './src/store/uiStore.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('import { supabase }')) {
  content = content.replace("import { create } from 'zustand';", "import { create } from 'zustand';\nimport { supabase } from '@/integrations/supabase/client';");
}

// 2. Add setHiddenListIds to interface
if (!content.includes('setHiddenListIds:')) {
  content = content.replace('cleanupHiddenLists: (existingListIds: string[]) => void;', 'cleanupHiddenLists: (existingListIds: string[]) => void;\n  setHiddenListIds: (ids: Set<string>) => void;');
}

// 3. Update toggleListVisibility to save to cloud and add setHiddenListIds
if (!content.includes('syncHiddenListsToCloud')) {
  const syncFunction = `\nasync function syncHiddenListsToCloud(ids: Set<string>) {
  localStorage.setItem('node-hidden-lists', JSON.stringify(Array.from(ids)));
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await supabase.auth.updateUser({
      data: { hidden_lists: Array.from(ids) }
    });
  }
}\n\nexport const useUIStore`;

  content = content.replace('export const useUIStore', syncFunction);

  content = content.replace(
    /      \/\/ saveHiddenLists\(next\);\n      return \{ hiddenListIds: next \};\n    \}\);\n  \},/,
    `      syncHiddenListsToCloud(next);\n      return { hiddenListIds: next };\n    });\n  },\n  setHiddenListIds: (ids) => set({ hiddenListIds: ids }),`
  );
  
  // also replace any existing saveHiddenLists if exists
  content = content.replace(
    /saveHiddenLists\(next\);/g,
    `syncHiddenListsToCloud(next);`
  );
}

fs.writeFileSync(filePath, content);
