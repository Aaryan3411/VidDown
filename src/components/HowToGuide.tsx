import React from 'react';
import { HelpCircle, MousePointerClick, ShieldCheck, Cpu, Code2, Globe } from 'lucide-react';

export const HowToGuide: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-xs space-y-8">
      <div>
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <HelpCircle className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Help & Tips</span>
        </div>
        <h3 className="text-xl font-bold text-zinc-900">
          How to Find and Download Videos from Any URL
        </h3>
        <p className="text-sm text-zinc-500 mt-1">
          This downloader works with direct media streams, CDN endpoints, and webpage embedded sources.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h4 className="font-semibold text-zinc-900 text-base">Direct Video Links</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Any URL pointing directly to a video container format (such as <code>.mp4</code>, <code>.webm</code>, <code>.mov</code>, <code>.mkv</code>, <code>.ogv</code>, or <code>.m4v</code>) will be inspected, previewed in the player, and downloaded with exact byte streaming.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h4 className="font-semibold text-zinc-900 text-base">Right-Click Video Trick</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            On most websites using HTML5 video players, you can simply right-click directly on the playing video and select <span className="font-medium text-zinc-900">"Copy video address"</span> or <span className="font-medium text-zinc-900">"Copy audio/video link"</span>, then paste it here.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            3
          </div>
          <h4 className="font-semibold text-zinc-900 text-base">Browser DevTools Network Filter</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-zinc-300 rounded text-[11px] font-mono">F12</kbd> or right-click and choose <strong>Inspect</strong>. Switch to the <strong>Network</strong> tab, click the <strong>Media</strong> filter, and play the video. The streaming video request will immediately appear in the list! Right click to copy its URL.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            4
          </div>
          <h4 className="font-semibold text-zinc-900 text-base">Automatic Webpage Extraction</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            If you enter a normal webpage URL (e.g. an article or blog post), our server automatically probes the page HTML for <code>&lt;video&gt;</code>, <code>&lt;source&gt;</code>, and OpenGraph/Twitter media tags and extracts every stream found.
          </p>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200/70 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-950 space-y-1">
          <p className="font-semibold">Bypass Browser CORS Limitations</p>
          <p className="text-blue-900/80 leading-relaxed">
            Browsers normally block direct downloads of cross-origin files or open them in a tab instead of saving to disk. Our backend stream proxy attaches authentic <code>Content-Disposition: attachment</code> headers so your browser directly triggers a file save prompt.
          </p>
        </div>
      </div>
    </div>
  );
};
