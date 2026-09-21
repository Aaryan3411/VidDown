import React, { useState, useRef } from 'react';
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  FileVideo,
  HardDrive,
  Globe,
  Play,
  RotateCcw,
  Edit2,
  Sparkles,
  Terminal,
  Music,
  Info,
  Youtube,
  AlertCircle,
} from 'lucide-react';
import { VideoProbeResult } from '../types';
import { formatBytes, formatDuration, extractYouTubeId, getYouTubeDownloadLinks } from '../utils';

interface VideoPreviewCardProps {
  video: VideoProbeResult;
  onDownloadStarted: (filename: string, url: string, sizeBytes: number | null, contentType: string) => void;
}

export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({
  video,
  onDownloadStarted,
}) => {
  const youTubeId = video.youTubeId || extractYouTubeId(video.url);
  const isYouTube = Boolean(video.isYouTube || youTubeId);

  const [customFilename, setCustomFilename] = useState<string>(
    video.filename || (isYouTube ? `${video.title || 'youtube_video'}.mp4` : 'video.mp4')
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [showCorsHelp, setShowCorsHelp] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [useDirectStream, setUseDirectStream] = useState<boolean>(
    typeof window !== 'undefined' && window.location.hostname.includes('github.io')
  );

  const streamProxyUrl = `/api/stream-proxy?url=${encodeURIComponent(video.url)}`;
  const effectiveStreamSrc = useDirectStream ? video.url : streamProxyUrl;
  const downloadApiUrl = `/api/download?url=${encodeURIComponent(video.url)}&filename=${encodeURIComponent(
    customFilename
  )}`;

  const ytLinks = youTubeId ? getYouTubeDownloadLinks(youTubeId) : null;

  const handleMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    if (target.duration && !isNaN(target.duration)) {
      setDuration(target.duration);
    }
    if (target.videoWidth && target.videoHeight) {
      setVideoDimensions({ width: target.videoWidth, height: target.videoHeight });
    }
    setVideoError(null);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(video.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyCommand = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2500);
    } catch {
      // fallback
    }
  };

  // Direct media download handler
  const handleTriggerDirectDownload = async () => {
    setIsDownloading(true);
    setShowCorsHelp(false);

    onDownloadStarted(
      customFilename,
      video.url,
      video.sizeBytes ?? null,
      video.contentType ?? 'video/mp4'
    );

    const isStaticHost =
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('github.io') || window.location.protocol === 'file:');

    if (!isStaticHost) {
      // Running on full-stack server (e.g. Cloud Run, localhost): stream with Content-Disposition
      const link = document.createElement('a');
      link.href = downloadApiUrl;
      link.download = customFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setIsDownloading(false), 1500);
      return;
    }

    // Static Host (GitHub Pages): Attempt in-browser Blob download
    try {
      const response = await fetch(video.url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = customFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        setIsDownloading(false);
        return;
      }
    } catch {
      // Remote server blocked CORS fetch
    }

    // If CORS prevented automated Blob saving, display the helper modal
    setIsDownloading(false);
    setShowCorsHelp(true);
  };

  const cleanContentType = (video.contentType || 'video/mp4')
    .split(';')[0]
    .replace('video/', '')
    .toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isYouTube ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isYouTube ? <Youtube className="w-5 h-5" /> : <FileVideo className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 text-base truncate">
                {video.title || customFilename}
              </h3>
              {!isYouTube && (
                <button
                  type="button"
                  onClick={() => setIsEditingName(!isEditingName)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors"
                  title="Rename file"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500 truncate max-w-md">
              {video.author ? `${video.author} • ` : ''}
              {video.url}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-colors"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                <span>Copy URL</span>
              </>
            )}
          </button>

          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Open Source</span>
          </a>
        </div>
      </div>

      {/* Rename input if editing */}
      {isEditingName && !isYouTube && (
        <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3">
          <label htmlFor="custom-filename-input" className="text-xs font-semibold text-blue-900 shrink-0">
            File Name:
          </label>
          <input
            id="custom-filename-input"
            type="text"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder="video.mp4"
            className="flex-1 px-3 py-1.5 text-sm bg-white border border-blue-200 rounded-lg focus:outline-hidden focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setIsEditingName(false)}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Main Body: Video Player & Specs */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Video Player Column */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative aspect-video bg-zinc-950 rounded-xl overflow-hidden shadow-inner border border-zinc-800 flex items-center justify-center group">
            {isYouTube && youTubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youTubeId}?rel=0&modestbranding=1`}
                title={video.title || 'YouTube Video'}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : videoError ? (
              <div className="p-6 text-center text-zinc-400 space-y-2">
                <FileVideo className="w-10 h-10 mx-auto text-zinc-500" />
                <p className="text-sm font-medium text-zinc-300">Live preview unavailable</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  The video format or server configuration restricts in-browser preview, but direct download is still available.
                </p>
                <button
                  onClick={() => {
                    setVideoError(null);
                    if (videoRef.current) videoRef.current.load();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium pt-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Preview</span>
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={effectiveStreamSrc}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={handleMetadataLoaded}
                onError={() => {
                  if (!useDirectStream) {
                    setUseDirectStream(true);
                  } else {
                    setVideoError('Error loading video stream');
                  }
                }}
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
            <span className="flex items-center gap-1.5">
              {isYouTube ? (
                <>
                  <Youtube className="w-3.5 h-3.5 text-red-600" />
                  <span className="font-medium text-zinc-700">Interactive YouTube Player</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-blue-600" />
                  <span>{useDirectStream ? 'Direct source stream' : 'Preview streamed via proxy'}</span>
                </>
              )}
            </span>
            {duration && <span>Duration: {formatDuration(duration)}</span>}
          </div>
        </div>

        {/* Specifications & Actions Column */}
        <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
          {/* Metadata Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {isYouTube ? 'YouTube Properties' : 'Video Properties'}
              </h4>
              {isYouTube && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/80 rounded-md">
                  Web Stream (DASH/HLS)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isYouTube ? 'Quality Options' : 'Estimated Size'}</span>
                </div>
                <div className="text-sm font-bold text-zinc-900">
                  {isYouTube ? '1080p, 720p, 480p' : formatBytes(video.sizeBytes)}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                  <FileVideo className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Container / Type</span>
                </div>
                <div className="text-sm font-bold text-zinc-900 uppercase">
                  {isYouTube ? 'MP4 Video / MP3' : cleanContentType}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isYouTube ? 'Channel / Author' : 'Resolution'}</span>
                </div>
                <div className="text-sm font-bold text-zinc-900 truncate" title={video.author}>
                  {isYouTube
                    ? video.author || 'YouTube'
                    : videoDimensions
                    ? `${videoDimensions.width} × ${videoDimensions.height}`
                    : 'Auto-detecting...'}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Server Host</span>
                </div>
                <div className="text-sm font-bold text-zinc-900 truncate" title={video.host}>
                  {video.host || (isYouTube ? 'youtube.com' : 'Remote CDN')}
                </div>
              </div>
            </div>

            {video.acceptRanges && !isYouTube && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200/60">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Server supports byte-range streaming and resume</span>
              </div>
            )}
          </div>

          {/* Download Action Section */}
          {isYouTube && ytLinks ? (
            /* YouTube Specific Download Options */
            <div className="space-y-3 pt-3 border-t border-zinc-100">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                  <Download className="w-3.5 h-3.5 text-red-600" />
                  <span>Download MP4 / MP3:</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  YouTube streams are delivered in adaptive segments. Use the verified fast downloaders below:
                </p>
              </div>

              {/* Primary 1-Click Button */}
              <a
                href={ytLinks.saveFromUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onDownloadStarted(customFilename, video.url, null, 'video/mp4')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-red-600/20 active:scale-[0.99] transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4 (Fast 1-Click SaveFrom)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-1" />
              </a>

              {/* Alternative Downloaders */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={ytLinks.y2metaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Via Y2Meta</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>

                <a
                  href={ytLinks.tenDownloaderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Via 10Downloader</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </div>

              {/* Terminal CLI Command */}
              <div className="p-3 bg-zinc-900 rounded-xl text-zinc-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download via Terminal (yt-dlp)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCommand(ytLinks.ytDlpVideoCmd)}
                    className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
                  >
                    {copiedCmd ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="font-mono text-[11px] overflow-x-auto text-zinc-300 py-1 select-all bg-black/40 px-2 rounded-sm">
                  {ytLinks.ytDlpVideoCmd}
                </pre>
              </div>
            </div>
          ) : (
            /* Direct Media Stream Download Options */
            <div className="space-y-3 pt-4 border-t border-zinc-100">
              <button
                id="btn-trigger-download"
                type="button"
                onClick={handleTriggerDirectDownload}
                disabled={isDownloading}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-base font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all"
              >
                <Download className="w-5 h-5" />
                <span>{isDownloading ? 'Preparing Download...' : 'Download Video Now'}</span>
              </button>

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                <span>Direct media container file</span>
                <span className="font-mono text-[11px] text-zinc-400">
                  .{customFilename.split('.').pop()}
                </span>
              </div>

              {/* Static CORS helper if direct automated save was blocked */}
              {showCorsHelp && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-3 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950">
                        Host Restrictions Detected (CORS)
                      </p>
                      <p className="text-amber-800 mt-0.5 leading-relaxed">
                        This media host prohibits automated script downloads in the browser. You can save it directly using either method:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200/80 space-y-1">
                      <span className="font-semibold text-zinc-900">Method 1: Right-Click Player</span>
                      <p className="text-zinc-600 text-[11px]">
                        Right-click the video player on the left and select <strong className="text-zinc-900">"Save Video As..."</strong> to save the exact stream directly to your files.
                      </p>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-amber-200/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-zinc-900">Method 2: Direct Stream</span>
                        <p className="text-zinc-600 text-[11px]">Open stream in video viewer and press Ctrl+S.</p>
                      </div>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-medium shrink-0"
                      >
                        Open Stream
                      </a>
                    </div>

                    <div className="p-2.5 bg-zinc-900 text-zinc-100 rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="font-mono text-[11px]">Method 3: Terminal curl</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCommand(`curl -L -o "${customFilename}" "${video.url}"`)}
                          className="text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          {copiedCmd ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre className="font-mono text-[10px] text-zinc-300 overflow-x-auto select-all">
                        curl -L -o "{customFilename}" "{video.url}"
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
