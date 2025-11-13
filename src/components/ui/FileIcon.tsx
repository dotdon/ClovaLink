import { Icon } from './Icon';

interface FileIconProps {
  mimeType: string;
  className?: string;
}

export function FileIcon({ mimeType, className = '' }: FileIconProps) {
  const getIconName = () => {
    if (mimeType.startsWith('image/')) return 'file-image';
    if (mimeType.startsWith('audio/')) return 'file-audio';
    if (mimeType.startsWith('video/')) return 'file-video';
    if (mimeType.includes('pdf')) return 'file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'file-excel';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'file-archive';
    if (mimeType.includes('code') || mimeType.includes('javascript') || mimeType.includes('json')) return 'file-code';
    return 'file';
  };

  return <Icon icon={getIconName()} className={className} />;
} 