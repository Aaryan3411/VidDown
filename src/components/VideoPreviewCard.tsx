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
} from 'lucide-react';
import { VideoProbeResult } from '../types';
import { formatBytes, formatDuration } from '../utils';

interface VideoPreviewCardProps {
  video: VideoProbeResult;
  onDownloadStarted: (filename: string, url: string, sizeBytes: number | null, contentType: string) => void;
}

export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({
  video,
  onDownloadStarted,
}) => {
  const [customFilename, setCustomFilename] = useState<string>(video.filename || 'video.mp4');
  const [isEditingName, setIsEditingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamProxyUrl = `/api/stream-proxy?url=${encodeURIComponent(video.url)}`;
  const downloadApiUrl = `/api/download?url=${encodeURIComponent(video.url)}&filename=${encodeURIComponent(
    customFilename
  )}`;

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleTriggerDownload = () => {
    setIsDownloading(true);
    onDownloadStarted(
      customFilename,
      video.url,
      video.sizeBytes ?? null,
      video.contentType ?? 'video/mp4'
    );

    // Create an invisible anchor tag to initiate the download through the proxy
    const link = document.createElement('a');
    link.href = downloadApiUrl;
    link.download = customFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 2500);
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
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <FileVideo className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 text-base truncate">
                {customFilename}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingName(!isEditingName)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors"
                title="Rename file"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 truncate max-w-md">{video.url}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-colors"
          >
            {copied ? (
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
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden sm:inline">Open Source</span>
          </a>
        </div>
      </div>

      {/* Rename input if editing */}
      {isEditingName && (
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
            {videoError ? (
              <div className="p-6 text-center text-zinc-400 space-y-2">
                <FileVideo className="w-10 h-10 mx-auto text-zinc-500" />
                <p className="text-sm font-medium text-zinc-300">Live preview unavailable</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  The video format or server configuration may restrict in-browser preview, but direct download is still fully supported.
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
                src={streamProxyUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={handleMetadataLoaded}
                onError={() => setVideoError('Error loading video stream')}
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
            <span className="flex items-center gap-1.5">
              <Play className="w-3 h-3 text-blue-600" />
              <span>In-browser live preview streamed via server proxy</span>
            </span>
            {duration && <span>Duration: {formatDuration(duration)}</span>}
          </div>
        </div>

        {/* Specifications & Actions Column */}
        <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
          {/* Metadata Grid */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Video Properties
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Estimated Size</span>
                </div>
                <div className="text-sm font-bold text-zinc-900">
                  {formatBytes(video.sizeBytes)}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                  <FileVideo className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Container / Type</span>
                </div>
                <div className="text-sm font-bold text-zinc-900 uppercase">
                  {cleanContentType}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Resolution</span>
                </div>
                <div className="text-sm font-bold text-zinc-900">
                  {videoDimensions
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
                  {video.host || 'Remote CDN'}
                </div>
              </div>
            </div>

            {video.acceptRanges && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200/60">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Server supports byte-range streaming and resume</span>
              </div>
            )}
          </div>

          {/* Download Action Section */}
          <div className="space-y-3 pt-4 border-t border-zinc-100">
            <button
              id="btn-trigger-download"
              type="button"
              onClick={handleTriggerDownload}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-base font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-[0.99] transition-all"
            >
              <Download className="w-5 h-5" />
              <span>{isDownloading ? 'Starting Download...' : 'Download Video Now'}</span>
            </button>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span>Streams with Content-Disposition attachment</span>
              <span className="font-mono text-[11px] text-zinc-400">
                .{customFilename.split('.').pop()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
