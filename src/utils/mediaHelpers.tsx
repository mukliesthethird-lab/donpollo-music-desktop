import React from 'react';
import { Coffee, Sun, Zap, CloudRain, Compass, Headphones, Flame, Music } from 'lucide-react';
import type { VibeType, MixType } from './vibeRecommendation';

export type Page = 'home' | 'library' | 'playlist' | 'playlist-detail' | 'settings' | 'downloads' | 'artist' | 'profile' | 'sound-map' | 'qa-review';

export interface Playlist {
  id: string;
  name: string;
  avatar?: string;
  songs: any[];
  createdAt: number;
  discordId?: string;
  privacy?: string;
  collaborators?: string[];
  isTemporary?: boolean;
  mood?: VibeType;
  mixType?: MixType;
  description?: string;
  tagline?: string;
  gradient?: string;
  iconName?: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

export const renderMixIcon = (iconName?: string, size = 20, className = '') => {
  switch (iconName) {
    case 'coffee':
      return <Coffee size={size} className={className} />;
    case 'sun':
      return <Sun size={size} className={className} />;
    case 'zap':
      return <Zap size={size} className={className} />;
    case 'cloud-rain':
      return <CloudRain size={size} className={className} />;
    case 'compass':
      return <Compass size={size} className={className} />;
    case 'headphones':
      return <Headphones size={size} className={className} />;
    case 'flame':
      return <Flame size={size} className={className} />;
    default:
      return <Music size={size} className={className} />;
  }
};

export const getHighResImage = (url: string | undefined) => {
  if (!url) return 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&w=500&q=80';
  if (url.includes('i.ytimg.com')) {
    return url.replace('hqdefault.jpg', 'maxresdefault.jpg').replace('default.jpg', 'maxresdefault.jpg');
  }
  if (url.includes('mzstatic.com')) {
    return url.replace(/\d+x\d+([a-zA-Z]*)\.jpg/i, '1000x1000$1.jpg');
  }
  if (url.includes('lh3.googleusercontent.com')) {
    return url.replace(/=w\d+-h\d+/i, '=w1000-h1000').replace(/=s\d+/i, '=s1000');
  }
  return url;
};

export const getCleanThumbnail = (url: string | undefined) => {
  if (!url) return '';
  if (url.includes('i.ytimg.com') && url.includes('hqdefault.jpg')) {
    return url.replace('hqdefault.jpg', 'mqdefault.jpg');
  }
  return url;
};

export const applyDragGhost = (e: React.DragEvent, song: any) => {
  const dragGhost = document.createElement('div');

  const img = document.createElement('img');
  img.src = getCleanThumbnail(song.thumbnail) || getHighResImage(song.cover);
  img.style.width = '120px';
  img.style.height = '120px';
  img.style.borderRadius = '16px';
  img.style.objectFit = 'cover';
  img.style.boxShadow = '0 10px 25px rgba(0,0,0,0.8)';

  const infoContainer = document.createElement('div');
  infoContainer.style.background = 'rgba(0,0,0,0.8)';
  infoContainer.style.backdropFilter = 'blur(10px)';
  infoContainer.style.padding = '8px 12px';
  infoContainer.style.borderRadius = '12px';
  infoContainer.style.marginTop = '12px';
  infoContainer.style.textAlign = 'center';
  infoContainer.style.color = 'white';
  infoContainer.style.width = '160px';
  infoContainer.style.boxSizing = 'border-box';
  infoContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';

  const title = document.createElement('div');
  title.innerText = song.title;
  title.style.fontSize = '13px';
  title.style.fontWeight = '700';
  title.style.whiteSpace = 'nowrap';
  title.style.overflow = 'hidden';
  title.style.textOverflow = 'ellipsis';
  title.style.fontFamily = 'Inter, sans-serif';

  const artist = document.createElement('div');
  artist.innerText = song.artist || song.uploader || 'Unknown Artist';
  artist.style.fontSize = '11px';
  artist.style.color = 'rgba(255,255,255,0.7)';
  artist.style.whiteSpace = 'nowrap';
  artist.style.overflow = 'hidden';
  artist.style.textOverflow = 'ellipsis';
  artist.style.marginTop = '4px';
  artist.style.fontFamily = 'Inter, sans-serif';

  infoContainer.appendChild(title);
  infoContainer.appendChild(artist);

  dragGhost.appendChild(img);
  dragGhost.appendChild(infoContainer);

  dragGhost.style.position = 'absolute';
  dragGhost.style.top = '-1000px';
  dragGhost.style.display = 'flex';
  dragGhost.style.flexDirection = 'column';
  dragGhost.style.alignItems = 'center';
  dragGhost.className = 'dragging-ghost';

  document.body.appendChild(dragGhost);
  e.dataTransfer.setDragImage(dragGhost, 60, 60);

  setTimeout(() => {
    if (document.body.contains(dragGhost)) document.body.removeChild(dragGhost);
  }, 100);

  const currentTarget = e.currentTarget as HTMLElement;
  currentTarget.classList.add('dragging-origin');
};
