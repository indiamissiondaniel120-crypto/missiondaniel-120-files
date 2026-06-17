'use server';
/**
 * @fileOverview A robust programmatic fetcher to extract video information from YouTube URLs.
 * 
 * - fetchYoutubePlaylist - Extracts video titles and URLs from a playlist.
 * - fetchSingleVideoInfo - Extracts title and info for a single video.
 * - Supports Public and Unlisted content by parsing ytInitialData with deep-scan and regex fallbacks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FetchYoutubePlaylistInputSchema = z.object({
  url: z.string().describe('The YouTube playlist URL to extract videos from.'),
});

const VideoInfoSchema = z.object({
  title: z.string().describe('The title of the video.'),
  url: z.string().describe('The full YouTube URL of the video.'),
});

const FetchYoutubePlaylistOutputSchema = z.object({
  videos: z.array(VideoInfoSchema).describe('A list of extracted videos from the playlist.'),
});

const FetchSingleVideoInputSchema = z.object({
  url: z.string().describe('A single YouTube video URL.'),
});

const FetchSingleVideoOutputSchema = z.object({
  title: z.string().describe('The title of the video.'),
  videoId: z.string().describe('The 11-character video ID.'),
});

export type FetchYoutubePlaylistInput = z.infer<typeof FetchYoutubePlaylistInputSchema>;
export type FetchYoutubePlaylistOutput = z.infer<typeof FetchYoutubePlaylistOutputSchema>;
export type FetchSingleVideoInput = z.infer<typeof FetchSingleVideoInputSchema>;
export type FetchSingleVideoOutput = z.infer<typeof FetchSingleVideoOutputSchema>;

/**
 * Robustly tries to extract a title from a YouTube renderer object.
 */
function tryGetTitle(v: any): string | null {
  if (!v) return null;
  const title = (
    v.title?.runs?.[0]?.text || 
    v.title?.simpleText || 
    v.title?.accessibility?.accessibilityData?.label ||
    v.headline?.simpleText ||
    v.label?.simpleText ||
    v.title?.runs?.[0]?.accessibility?.accessibilityData?.label ||
    v.text?.runs?.[0]?.text ||
    v.title?.accessibility?.label
  );
  return title ? String(title).trim() : null;
}

/**
 * Recursively scans an object to find all instances of video data.
 */
function collectAllVideos(obj: any, foundVideos: Map<string, any> = new Map()): any[] {
  if (!obj || typeof obj !== 'object') return Array.from(foundVideos.values());

  const rKeys = ['playlistVideoRenderer', 'gridVideoRenderer', 'videoRenderer', 'childVideoRenderer', 'richItemRenderer'];
  for (const k of rKeys) {
    if (obj[k]) {
      const v = obj[k].videoRenderer || obj[k].playlistVideoRenderer || obj[k];
      const videoId = v.videoId;
      if (videoId && !foundVideos.has(videoId)) {
        const title = tryGetTitle(v) || `Video ${videoId}`;
        foundVideos.set(videoId, {
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`
        });
      }
    }
  }

  if (Array.isArray(obj)) {
    for (const item of obj) collectAllVideos(item, foundVideos);
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        collectAllVideos(obj[key], foundVideos);
      }
    }
  }

  return Array.from(foundVideos.values());
}

/**
 * Programmatically extracts data from YouTube HTML.
 */
async function extractFromHtml(url: string, mode: 'playlist' | 'video'): Promise<any> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`YouTube returned status ${response.status}`);
    const html = await response.text();

    // Stage 1: JSON Extraction
    let jsonData = null;
    const marker = 'ytInitialData = ';
    const startIndex = html.indexOf(marker);
    if (startIndex !== -1) {
      const dataPart = html.substring(startIndex + marker.length);
      let braceCount = 0;
      let endIndex = -1;
      for (let i = 0; i < dataPart.length; i++) {
        if (dataPart[i] === '{') braceCount++;
        else if (dataPart[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      if (endIndex !== -1) {
        try {
          jsonData = JSON.parse(dataPart.substring(0, endIndex));
        } catch (e) {}
      }
    }

    if (mode === 'playlist') {
      let videos = jsonData ? collectAllVideos(jsonData) : [];
      if (videos.length === 0) {
        const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const matches = html.matchAll(videoIdRegex);
        const uniqueIds = new Set<string>();
        for (const match of matches) {
          const id = match[1];
          if (!uniqueIds.has(id)) {
            uniqueIds.add(id);
            const area = html.substring(Math.max(0, match.index! - 800), Math.min(html.length, match.index! + 800));
            const titleMatch = area.match(/"title":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/i) || area.match(/"title":\s*\{\s*"simpleText":\s*"([^"]+)"/i);
            const title = titleMatch ? titleMatch[1] : `Video ${id}`;
            videos.push({ title, url: `https://www.youtube.com/watch?v=${id}` });
          }
        }
      }
      return videos;
    } else {
      // Single video mode
      let title = '';
      if (jsonData) {
        title = jsonData.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.title?.runs?.[0]?.text || '';
      }
      if (!title) {
        const titleRegex = /<title>([^<]+) - YouTube<\/title>/i;
        const metaTitleRegex = /<meta name="title" content="([^"]+)">/i;
        const jsonTitleRegex = /"title":\s*\{\s*"runs":\s*\[\s*\{\s*"text":\s*"([^"]+)"/i;
        const match = html.match(titleRegex) || html.match(metaTitleRegex) || html.match(jsonTitleRegex);
        title = match ? match[1] : 'Unknown Video';
      }
      return title;
    }
  } catch (error: any) {
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

export async function fetchYoutubePlaylist(input: FetchYoutubePlaylistInput): Promise<FetchYoutubePlaylistOutput> {
  return fetchYoutubePlaylistFlow(input);
}

export async function fetchSingleVideoInfo(input: FetchSingleVideoInput): Promise<FetchSingleVideoOutput> {
  const url = input.url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (!match || match[2].length !== 11) throw new Error("Invalid YouTube URL");
  
  const videoId = match[2];
  const title = await extractFromHtml(`https://www.youtube.com/watch?v=${videoId}`, 'video');
  return { title, videoId };
}

const fetchYoutubePlaylistFlow = ai.defineFlow(
  {
    name: 'fetchYoutubePlaylistFlow',
    inputSchema: FetchYoutubePlaylistInputSchema,
    outputSchema: FetchYoutubePlaylistOutputSchema,
  },
  async (input) => {
    const rawUrl = input.url.trim();
    if (!rawUrl) throw new Error("Playlist URL cannot be empty.");
    const listParam = rawUrl.match(/[?&]list=([^&#]+)/i);
    if (!listParam || !listParam[1]) throw new Error("Invalid URL. Must contain 'list='");
    const cleanUrl = `https://www.youtube.com/playlist?list=${listParam[1]}`;
    const videos = await extractFromHtml(cleanUrl, 'playlist');
    if (videos.length === 0) throw new Error("No videos found. Ensure the playlist is Public or Unlisted.");
    return { videos };
  }
);
