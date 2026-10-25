// Shared between server and browser: the shape of a gallery item and the public
// Drive URLs used to display it. Files inherit "anyone with the link can view"
// from the folder, so these URLs work without auth and are served by Google.

export type MediaKind = "image" | "video";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  guest: string | null;
  createdTime: string;
  durationMs?: number;
}

export interface MediaPage {
  items: MediaItem[];
  nextPageToken: string | null;
}

export interface EventConfig {
  uploadsOpen: boolean;
  maxFileMb: number;
}

export const thumbnailUrl = (id: string, width: number) =>
  `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;

export const videoPreviewUrl = (id: string) => `https://drive.google.com/file/d/${id}/preview`;

export const downloadUrl = (id: string) => `https://drive.google.com/uc?export=download&id=${id}`;
