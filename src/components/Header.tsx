import { Bookmark, Sparkles, ShieldCheck, Link2Off, RefreshCw, Archive, Bot, Coffee } from 'lucide-react';

interface HeaderProps {
  activeTab: 'audit' | 'organizer' | 'cleaner' | 'backup' | 'ai' | 'about';
  setActiveTab: (tab: 'audit' | 'organizer' | 'cleaner' | 'backup' | 'ai' | 'about') => void;
  bookmarkCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  bookmarkCount,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">EdgeMark</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Edge MV3
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {bookmarkCount} total bookmarks indexed
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'audit'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Audit & Health</span>
            </button>

            <button
              onClick={() => setActiveTab('organizer')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'organizer'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>PARA Reorganizer</span>
            </button>

            <button
              onClick={() => setActiveTab('cleaner')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'cleaner'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Link2Off className="w-4 h-4 text-indigo-500" />
              <span>URL Cleaner</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'backup'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Archive className="w-4 h-4 text-slate-500" />
              <span>Safety & Backups</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'ai'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Bot className="w-4 h-4 text-purple-600" />
              <span>AI & Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'about'
                  ? 'bg-white text-amber-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Coffee className="w-4 h-4 text-amber-600" />
              <span>About & Support</span>
            </button>
          </nav>

          {/* Action button */}
          <div className="flex items-center space-x-2">
            <a
              href="https://buymeacoffee.com/jonasaspma3"
              target="_blank"
              rel="noopener noreferrer"
              title="Support EdgeMark on Buy Me a Coffee"
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors"
            >
              <Coffee className="w-3.5 h-3.5 text-amber-700" />
              <span>Buy Me a Coffee</span>
            </a>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Reload bookmarks from Edge"
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
