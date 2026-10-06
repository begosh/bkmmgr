import React, { useState, useEffect } from 'react';
import { BookmarkItem } from '../types';
import { getAllBookmarks } from '../services/bookmarkManager';
import { Header } from '../components/Header';
import { AuditTab } from '../components/AuditTab';
import { OrganizerTab } from '../components/OrganizerTab';
import { UrlCleanerTab } from '../components/UrlCleanerTab';
import { BackupTab } from '../components/BackupTab';
import { SettingsTab } from '../components/SettingsTab';
import { AboutTab } from '../components/AboutTab';

export const ManagerApp: React.FC = () => {
  const getInitialTab = (): 'audit' | 'organizer' | 'cleaner' | 'backup' | 'ai' | 'about' => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (['audit', 'organizer', 'cleaner', 'backup', 'ai', 'about'].includes(hash)) {
        return hash as any;
      }
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['audit', 'organizer', 'cleaner', 'backup', 'ai', 'about'].includes(tabParam)) {
        return tabParam as any;
      }
    }
    return 'audit';
  };

  const [activeTab, setActiveTab] = useState<'audit' | 'organizer' | 'cleaner' | 'backup' | 'ai' | 'about'>(getInitialTab);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTabChange = (tab: 'audit' | 'organizer' | 'cleaner' | 'backup' | 'ai' | 'about') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  };

  const loadBookmarks = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      const items = await getAllBookmarks();
      setBookmarks(items);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        bookmarkCount={bookmarks.length}
        onRefresh={() => loadBookmarks(true)}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading Edge bookmarks...</p>
          </div>
        ) : (
          <>
            {activeTab === 'audit' && (
              <AuditTab bookmarks={bookmarks} onReload={() => loadBookmarks(false)} />
            )}
            {activeTab === 'organizer' && (
              <OrganizerTab bookmarks={bookmarks} onReload={() => loadBookmarks(false)} />
            )}
            {activeTab === 'cleaner' && (
              <UrlCleanerTab bookmarks={bookmarks} onReload={() => loadBookmarks(false)} />
            )}
            {activeTab === 'backup' && <BackupTab bookmarks={bookmarks} />}
            {activeTab === 'ai' && <SettingsTab />}
            {activeTab === 'about' && <AboutTab />}
          </>
        )}
      </main>
    </div>
  );
};
