import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, ChevronRight, Folder, FolderPlus, MoreHorizontal, Pencil, Search, Trash2, X, ArrowUpDown } from 'lucide-react';
import { BookmarkFolder, BookmarkItem } from '../types';
import { createFolder, deleteBookmark, getAllBookmarks, getBookmarkTree, moveBookmark, updateBookmark } from '../services/bookmarkManager';
import { createBookmarkSnapshot } from '../services/backupService';
import { sortFolder } from '../services/bookmarkSorter';

interface FolderEntry {id: string; title: string; path: string; parentId?: string; count: number; children: string[];}

function indexFolders(tree: BookmarkFolder[]): Map<string, FolderEntry> {
  const folders = new Map<string, FolderEntry>();
  function walk(node: BookmarkFolder | BookmarkItem, path: string[]): number {
    if ('url' in node) return 1;
    const segments = node.title ? [...path, node.title] : path;
    const children = (node.children || []).filter(child => !('url' in child));
    const count = (node.children || []).reduce((sum, child) => sum + walk(child, segments), 0);
    folders.set(node.id, {id: node.id, title: node.title || 'Bookmarks', path: segments.join(' / '), parentId: node.parentId,
      children: children.map(child => child.id), count});
    return count;
  }
  tree.forEach(node => walk(node, []));
  return folders;
}

function hostname(url: string): string {
  try {return new URL(url).hostname.replace(/^www\./, '');} catch {return url;}
}

export const SidebarLibrary: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [tree, setTree] = useState<BookmarkFolder[]>([]);
  const [folderId, setFolderId] = useState('');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<BookmarkItem | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftFolder, setDraftFolder] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newFolder, setNewFolder] = useState(false);
  const [folderTitle, setFolderTitle] = useState('');
  const reloadVersion = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const mutationLock = useRef(false);
  const snapshotSaved = useRef(false);
  const folders = useMemo(() => indexFolders(tree), [tree]);
  const current = folders.get(folderId);

  const reload = async () => {
    const version = ++reloadVersion.current;
    try {
      const [items, nodes] = await Promise.all([getAllBookmarks(), getBookmarkTree()]);
      if (version !== reloadVersion.current) return;
      setBookmarks(items); setTree(nodes); setLoading(false);
    } catch {if (version === reloadVersion.current) {setError('Could not load bookmarks. Reopen the sidebar to retry.'); setLoading(false);}}
  };

  useEffect(() => {
    reload();
    let timer: ReturnType<typeof setTimeout>;
    const changed = () => {clearTimeout(timer); timer = setTimeout(reload, 100);};
    const api = typeof chrome !== 'undefined' ? chrome.bookmarks : undefined;
    const events = [api?.onCreated, api?.onChanged, api?.onMoved, api?.onRemoved, api?.onChildrenReordered, api?.onImportEnded];
    events.forEach(event => event?.addListener(changed));
    return () => {reloadVersion.current++; clearTimeout(timer); events.forEach(event => event?.removeListener(changed));};
  }, []);

  useEffect(() => {if (folderId && !folders.has(folderId)) setFolderId('');}, [folders, folderId]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return bookmarks.filter(item => text
      ? `${item.title} ${item.url} ${item.folderPath || ''}`.toLowerCase().includes(text)
      : !folderId || item.parentId === folderId)
      .sort((a, b) => order === 'title' ? a.title.localeCompare(b.title) : order === 'site'
        ? hostname(a.url).localeCompare(hostname(b.url)) || a.title.localeCompare(b.title)
        : (b.dateAdded || 0) - (a.dateAdded || 0));
  }, [bookmarks, folderId, query, order]);
  const childFolders = query.trim() ? [] : current ? current.children.map(id => folders.get(id)!).filter(Boolean)
    : Array.from(folders.values()).filter(folder => folder.title !== 'Bookmarks' && (!folder.parentId || folder.parentId === '0'));
  const destinations = Array.from(folders.values()).filter(folder => folder.id !== '0').sort((a,b) => a.path.localeCompare(b.path));
  const breadcrumbs: FolderEntry[] = [];
  let ancestor = current;
  const seen = new Set<string>();
  while (ancestor && ancestor.id !== '0' && !seen.has(ancestor.id)) {
    seen.add(ancestor.id); breadcrumbs.unshift(ancestor); ancestor = folders.get(ancestor.parentId || '');
  }

  const edit = (item: BookmarkItem) => {
    setError(''); setEditor(item); setDraftTitle(item.title); setDraftUrl(item.url);
    setDraftFolder(item.parentId || destinations[0]?.id || ''); setDeleting(false);
    snapshotSaved.current = false;
  };
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor || mutationLock.current) return;
    try {
      const parsed = new URL(draftUrl.trim());
      if (draftUrl.trim() !== editor.url && !['http:', 'https:', 'ftp:', 'file:'].includes(parsed.protocol)) throw new Error('Use a valid web, FTP, or file URL. Existing special links may keep their URL.');
      if (!draftTitle.trim() || !draftFolder) throw new Error('A title and destination folder are required.');
      mutationLock.current = true; setBusy(true); setError('');
      if (!snapshotSaved.current) {await createBookmarkSnapshot(); snapshotSaved.current = true;}
      const moved = draftFolder !== editor.parentId;
      if (moved) await moveBookmark(editor.id, draftFolder);
      try {await updateBookmark(editor.id, {title: draftTitle.trim(), url: draftUrl.trim()});}
      catch (error) {
        if (moved && editor.parentId) {
          try {await moveBookmark(editor.id, editor.parentId);}
          catch {throw new Error('Bookmark moved, but its edit failed and the original folder could not be restored. The original safety backup is retained.');}
        }
        throw error;
      }
      setEditor(null); setMessage('Bookmark updated.'); await reload();
    } catch (err) {setError(err instanceof Error ? err.message : 'Could not update bookmark.');}
    finally {mutationLock.current = false; setBusy(false);}
  };
  const remove = async () => {
    if (!editor || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setError('');
    try {if (!snapshotSaved.current) {await createBookmarkSnapshot(); snapshotSaved.current = true;} await deleteBookmark(editor.id); setEditor(null); setMessage('Bookmark deleted. Safety backup saved.'); await reload();}
    catch (err) {setError(err instanceof Error ? err.message : 'Could not delete bookmark.');}
    finally {mutationLock.current = false; setBusy(false);}
  };
  const addFolder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mutationLock.current) return;
    const parent = folderId || destinations.find(folder => folder.parentId === '0')?.id || destinations[0]?.id;
    if (!parent || !folderTitle.trim()) return;
    mutationLock.current = true; setBusy(true); setError('');
    try {await createFolder(folderTitle.trim(), parent); setNewFolder(false); setFolderTitle(''); setMessage('Folder created.'); await reload();}
    catch (err) {setError(err instanceof Error ? err.message : 'Could not create folder.');}
    finally {mutationLock.current = false; setBusy(false);}
  };
  const sortCurrentFolder = async () => {
    if (!folderId || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setError('');
    try {await sortFolder(folderId, {criteria:'alpha-asc', sortSubfoldersFirst:true}); setOrder('title'); setMessage('Folder sorted A–Z. Safety backup saved.'); await reload();}
    catch (err) {setError(err instanceof Error ? err.message : 'Could not sort folder.');}
    finally {mutationLock.current = false; setBusy(false);}
  };

  return <section className="flex min-h-0 flex-1 flex-col" aria-label="Bookmark library">
    <div className="px-4 pt-4 pb-3 space-y-3 bg-white border-b border-slate-200 shrink-0">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input ref={searchInput} aria-label="Search bookmarks" placeholder="Search titles, sites, or folders" value={query} onChange={e=>setQuery(e.target.value)}
          onKeyDown={e=>{if(e.key==='Escape')setQuery('');}}
          className="w-full bg-slate-100 border border-transparent focus:border-blue-400 focus:bg-white rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none" />
        {query && <button aria-label="Clear search" onClick={()=>{setQuery('');searchInput.current?.focus();}} className="absolute right-2 top-2 p-1 text-slate-500"><X className="w-4 h-4"/></button>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{query.trim() ? `${visible.length} search results · all folders` : `${visible.length} bookmarks${current ? ' in this folder' : ' in your library'}`}</p>
        <select aria-label="Bookmark display order" value={order} onChange={e=>setOrder(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg p-1.5">
          <option value="recent">Newest first</option><option value="title">Title A–Z</option><option value="site">By site</option>
        </select>
      </div>
      <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-xs">
        <button onClick={()=>{setFolderId('');setQuery('');}} className={`rounded-md px-2 py-1 ${!current?'bg-blue-50 text-blue-700 font-semibold':'text-slate-500 hover:bg-slate-100'}`}>All bookmarks</button>
        {breadcrumbs.map(folder=><React.Fragment key={folder.id}><ChevronRight className="w-3 h-3 text-slate-400"/><button onClick={()=>{setFolderId(folder.id);setQuery('');}} className="text-slate-700 hover:bg-slate-100 rounded px-1.5 py-1 max-w-[180px] truncate" title={folder.path}>{folder.title}</button></React.Fragment>)}
      </nav>
    </div>
    {(message || error) && <div role={error?'alert':'status'} className={`mx-4 mt-3 p-2.5 text-xs rounded-lg ${error?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-800'}`}>{error || message}</div>}
    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
      {childFolders.length>0 && <div className="mb-3 space-y-1">{childFolders.map(folder=><button key={folder.id} onClick={()=>setFolderId(folder.id)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white text-left border border-transparent hover:border-slate-200">
        <Folder className="w-5 h-5 text-amber-500 shrink-0"/><span className="flex-1 min-w-0 font-medium text-sm truncate">{folder.title}</span><span className="text-xs text-slate-400">{folder.count}</span><ChevronRight className="w-4 h-4 text-slate-400"/>
      </button>)}</div>}
      {loading ? <p className="p-5 text-center text-slate-500">Loading bookmarks…</p> : visible.length===0 ? <div className="py-10 px-4 text-center text-slate-500"><Bookmark className="w-8 h-8 mx-auto mb-3 text-slate-300"/><p className="font-medium text-sm">{query?'No matching bookmarks':'No bookmarks here yet'}</p><p className="mt-1 text-xs">{query?'Try a title, website, or folder name.':'Open a folder or use Save page to add a bookmark.'}</p></div> :
        visible.map(item=><div key={item.id} className="group flex items-center gap-2 bg-white rounded-xl border border-slate-200/80 px-3 py-3 mb-2 hover:border-blue-200 hover:shadow-sm transition-all">
          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-semibold" aria-hidden="true">{hostname(item.url).slice(0,1).toUpperCase() || <Bookmark className="w-4 h-4"/>}</span>
          <a aria-label={item.title} href={/^(https?|ftp|file):/i.test(item.url) ? item.url : undefined} aria-disabled={!/^(https?|ftp|file):/i.test(item.url)} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded" title={`${item.title}\n${item.url}`}>
            <span className="block text-sm font-medium text-slate-900 truncate hover:text-blue-700">{item.title}</span>
            <span className="block text-xs text-slate-500 truncate mt-0.5">{hostname(item.url)}</span>
            {!/^(https?|ftp|file):/i.test(item.url) && <span className="text-[11px] text-amber-700">Open special links from the browser's bookmark manager</span>}
            {(!folderId || query.trim()) && <span className="block text-[11px] text-slate-400 truncate mt-1">{item.folderPath}</span>}
          </a>
          <button aria-label={`Edit ${item.title}`} title="Edit, move, or delete bookmark" onClick={()=>edit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg shrink-0"><MoreHorizontal className="w-4 h-4"/></button>
        </div>)}
    </div>
    <div className="flex gap-2 justify-between px-4 py-2.5 bg-white border-t border-slate-200 shrink-0">
      <button onClick={()=>{setNewFolder(true);setError('');}} className="sidebar-button"><FolderPlus className="w-4 h-4"/>New folder</button>
      {folderId && <button disabled={busy} onClick={sortCurrentFolder} className="sidebar-button"><ArrowUpDown className="w-4 h-4"/>Sort folder A–Z</button>}
    </div>
    {(editor || newFolder) && <div className="absolute inset-0 z-20 bg-slate-950/30 flex items-end sm:items-center p-3" onKeyDown={e=>{
      if(e.key==='Escape'&&!busy){setEditor(null);setNewFolder(false);}
      if(e.key==='Tab') {
        const focusable=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
        if(!focusable?.length)return;
        const first=focusable[0],last=focusable[focusable.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label={editor?'Edit bookmark':'New folder'} className="bg-white w-full rounded-2xl shadow-xl p-4 space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center"><h2 className="font-semibold text-base flex items-center gap-2"><Pencil className="w-4 h-4 text-blue-600"/>{editor?'Edit bookmark':'New folder'}</h2><button aria-label="Close editor" disabled={busy} onClick={()=>{setEditor(null);setNewFolder(false);}} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4"/></button></div>
        {error && <p role="alert" className="text-xs text-red-700 bg-red-50 p-2 rounded-lg">{error}</p>}
        {editor ? <form onSubmit={saveEdit} className="space-y-3"><fieldset disabled={busy} className="space-y-3">
          <label className="block text-xs font-medium">Title<input autoFocus required value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} className="sidebar-input mt-1"/></label>
          <label className="block text-xs font-medium">URL<input required value={draftUrl} onChange={e=>setDraftUrl(e.target.value)} className="sidebar-input mt-1"/></label>
          <label className="block text-xs font-medium">Folder<select aria-label="Folder" value={draftFolder} onChange={e=>setDraftFolder(e.target.value)} className="sidebar-input mt-1">{destinations.map(folder=><option key={folder.id} value={folder.id}>{folder.path || folder.title}</option>)}</select></label>
          <p className="text-[11px] text-slate-500">A safety backup is saved before changes.</p>
          <button disabled={busy} className="w-full rounded-xl bg-blue-600 text-white py-2.5 font-semibold text-sm disabled:opacity-50">{busy?'Saving…':'Save changes'}</button>
          {deleting ? <div className="bg-red-50 rounded-lg p-3 space-y-2"><p className="text-xs text-red-800">Delete this bookmark? Dashboard → Backups can download the latest safety backup as HTML for browser import.</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={remove} className="sidebar-button text-red-700">Delete bookmark</button><button type="button" disabled={busy} onClick={()=>setDeleting(false)} className="sidebar-button">Cancel</button></div></div> : <button type="button" disabled={busy} onClick={()=>setDeleting(true)} className="text-xs text-red-600 flex gap-1.5 items-center"><Trash2 className="w-3.5 h-3.5"/>Delete bookmark…</button>}
        </fieldset></form> : <form onSubmit={addFolder} className="space-y-3"><p className="text-xs text-slate-500">Inside {current?.path || destinations.find(folder=>folder.parentId==='0')?.path || 'Bookmarks'}</p><label className="block text-xs font-medium">Folder name<input autoFocus disabled={busy} required value={folderTitle} onChange={e=>setFolderTitle(e.target.value)} className="sidebar-input mt-1"/></label><button disabled={busy} className="w-full bg-blue-600 text-white rounded-xl py-2.5 font-semibold">Create folder</button></form>}
        <button disabled={busy} onClick={()=>{setEditor(null);setNewFolder(false);}} className="text-xs text-slate-500 flex gap-1 items-center"><ArrowLeft className="w-3 h-3"/>Back to bookmarks</button>
      </div>
    </div>}
  </section>;
};
