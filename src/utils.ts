import { SampleVideo } from './types';

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes <= 0) {
    return 'Unknown size';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);

  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    title: 'Blooming Flower (MP4)',
    resolution: '640 × 360',
    format: 'MP4',
    sizeApprox: '~1.1 MB',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  },
  {
    title: 'Sintel Short Animation (MP4)',
    resolution: '854 × 480',
    format: 'MP4',
    sizeApprox: '~22.3 MB',
    url: 'https://raw.githubusercontent.com/mdn/learning-area/main/javascript/apis/video-audio/finished/video/sintel-short.mp4',
  },
  {
    title: 'Big Buck Bunny (WebM)',
    resolution: '854 × 480',
    format: 'WebM',
    sizeApprox: '~96.6 MB',
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.vp9.webm',
  },
  {
    title: 'Blooming Flower (WebM)',
    resolution: '640 × 360',
    format: 'WebM',
    sizeApprox: '~554 KB',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
  },
];
