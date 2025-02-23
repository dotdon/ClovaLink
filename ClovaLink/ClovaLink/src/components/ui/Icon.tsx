import React from 'react';
import { 
  FaChevronDown, 
  FaChevronRight,
  FaChevronUp,
  FaEye,
  FaDownload,
  FaTrash,
  FaFile,
  FaFileWord,
  FaFilePdf,
  FaFileExcel,
  FaFileImage,
  FaFileAudio,
  FaFileVideo,
  FaFileArchive,
  FaFileCode,
  FaFolder,
  FaList,
  FaTh,
  FaUpload,
  FaInfoCircle,
  FaStar,
  FaClock,
  FaHistory,
  FaSearch
} from 'react-icons/fa';

const iconMap = {
  'chevron-down': FaChevronDown,
  'chevron-right': FaChevronRight,
  'chevron-up': FaChevronUp,
  'eye': FaEye,
  'download': FaDownload,
  'trash': FaTrash,
  'file': FaFile,
  'file-word': FaFileWord,
  'file-pdf': FaFilePdf,
  'file-excel': FaFileExcel,
  'file-image': FaFileImage,
  'file-audio': FaFileAudio,
  'file-video': FaFileVideo,
  'file-archive': FaFileArchive,
  'file-code': FaFileCode,
  'folder': FaFolder,
  'grid': FaTh,
  'list': FaList,
  'upload': FaUpload,
  'info': FaInfoCircle,
  'star': FaStar,
  'clock': FaClock,
  'history': FaHistory,
  'search': FaSearch
} as const;

type IconName = keyof typeof iconMap;

interface IconProps {
  icon: IconName;
  className?: string;
}

export function Icon({ icon, className = '' }: IconProps) {
  const IconComponent = iconMap[icon];
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
} 