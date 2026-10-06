import React, { useState } from 'react';
import { BookmarkItem } from '../types';
import {
  downloadJsonBackup,
  downloadNetscapeHtmlBackup,
  createBookmarkSnapshot,
} from '../services/backupService';
import {
  Download,
  ShieldCheck,
  FileCode,
  FileJson,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface BackupTabProps {
  bookmarks: BookmarkItem[];
}

export const BackupTab: React.FC<BackupTabProps> = ({ bookmarks }) => {
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);

  const handleCreateSnapshot = async () => {
    setIsTakingSnapshot(true);
    try {
      await createBookmarkSnapshot();
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 3000);
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Safety, Snapshots & Backups</h2>
            <p className="text-xs text-slate-500">
              Export your full bookmark collection at any time. Netscape HTML files can be directly
              imported into Microsoft Edge, Chrome, Safari, or Firefox.
            </p>
          </div>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          {/* Netscape HTML Export */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2">
              <FileCode className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Universal Bookmark HTML</h3>
            </div>
            <p className="text-xs text-slate-500">
              Standard Netscape Bookmark HTML format. Preserves full folder hierarchy, dates, and
              titles. Ideal for transferring to other browsers.
            </p>
            <button
              onClick={downloadNetscapeHtmlBackup}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export HTML File ({bookmarks.length} bookmarks)</span>
            </button>
          </div>

          {/* JSON Snapshot Export */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2">
              <FileJson className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">JSON Archive Snapshot</h3>
            </div>
            <p className="text-xs text-slate-500">
              Raw JSON representation including folder trees and timestamps. Perfect for developers
              and programmatic backups.
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={downloadJsonBackup}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Snapshot</span>
              </button>

              <button
                onClick={handleCreateSnapshot}
                disabled={isTakingSnapshot}
                className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTakingSnapshot ? 'animate-spin' : ''}`} />
                <span>Save Local Snapshot</span>
              </button>
            </div>
          </div>
        </div>

        {snapshotSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Local snapshot created and saved to storage.</span>
          </div>
        )}
      </div>

      {/* Safety Guarantees Callout */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-900 space-y-2">
        <div className="font-semibold flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <span>Non-Destructive Operations by Default</span>
        </div>
        <p className="text-blue-800 leading-relaxed">
          Before performing any batch reorganization, URL sanitization, or duplicate pruning, EdgeMark
          creates an internal snapshot. No bookmarks are permanently deleted without explicit user
          confirmation.
        </p>
      </div>
    </div>
  );
};
