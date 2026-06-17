
'use server';
/**
 * @fileOverview A robust programmatic fetcher to extract video information from a YouTube playlist URL.
 * 
 * - fetchYoutubePlaylist - Extracts video titles and URLs from a playlist without using LLM reasoning.
 * - Supports Public and Unlisted playlists by parsing ytInitialData with recursive deep-scan.
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

export type FetchYoutubePlaylistInput = z.infer<typeof FetchYoutubePlaylistInputSchema>;
export type FetchYoutubePlaylistOutput = z.infer<typeof FetchYoutubePlaylistOutputSchema>;

/**
 * Robustly tries to extract a title from a YouTube renderer object.
 */
function tryGetTitle(v: any): string | null {
  if (!v) return null;
  return (
    v.title?.runs?.[0]?.text || 
    v.title?.simpleText || 
    v.title?.accessibility?.accessibilityData?.label ||
    v.headline?.simpleText ||
    v.label?.simpleText ||
    v.title?.runs?.[0]?.accessibility?.accessibilityData?.label
  );
}

/**
 * Recursively scans an object to find all instances of video data.
 */
function collectAllVideos(obj: any, foundVideos: Map<string, any> = new Map()): any[] {
  if (!obj || typeof obj !== 'object') return Array.from(foundVideos.values());

  // Check for various video renderers used by YouTube
  const renderers = ['playlistVideoRenderer', 'gridVideoRenderer', 'videoRenderer', 'childVideoRenderer', 'richItemRenderer'];
  
  for (const rKey of renderers) {
    if (obj[rKey]) {
      const v = obj[rKey].videoRenderer || obj[rKey].playlistVideoRenderer || obj[rKey];
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

  // Recurse into all keys
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      collectAllVideos(obj[key], foundVideos);
    }
  }

  return Array.from(foundVideos.values());
}

/**
 * Programmatically extracts playlist data from YouTube HTML.
 */
async function extractVideosFromHtml(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`YouTube returned status ${response.status}`);
    const html = await response.text();

    // Stage 1: Attempt JSON extraction from common variable patterns
    const jsonPatterns = [
      /ytInitialData\s*=\s*({.+?})\s*;/s,
      /window\["ytInitialData"\]\s*=\s*({.+?})\s*;/s,
      /ytInitialData\s*=\s*({.+?})\s*<\/script>/s,
      /var\s+ytInitialData\s*=\s*({.+?})\s*;/s,
      /ytInitialData\s*=\s*({.*?})\s*[\};]/s
    ];

    let jsonData = null;
    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          jsonData = JSON.parse(match[1]);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    let videos: any[] = [];
    if (jsonData) {
      videos = collectAllVideos(jsonData);
    }

    // Stage 2: Fallback to raw regex matching if JSON parsing fails or finds nothing
    if (videos.length === 0) {
      const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
      const matches = html.matchAll(videoIdRegex);
      const uniqueIds = new Set<string>();
      for (const match of matches) {
        uniqueIds.add(match[1]);
      }
      
      if (uniqueIds.size > 0) {
        videos = Array.from(uniqueIds).map((id, index) => ({
          title: `Video ${index + 1} (${id})`,
          url: `https://www.youtube.com/watch?v=${id}`
        }));
      }
    }

    return videos;
  } catch (error: any) {
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

export async function fetchYoutubePlaylist(input: FetchYoutubePlaylistInput): Promise<FetchYoutubePlaylistOutput> {
  return fetchYoutubePlaylistFlow(input);
}

const fetchYoutubePlaylistFlow = ai.defineFlow(
  {
    name: 'fetchYoutubePlaylistFlow',
    inputSchema: FetchYoutubePlaylistInputSchema,
    outputSchema: FetchYoutubePlaylistOutputSchema,
  },
  async (input) => {
    const rawUrl = input.url.trim();
    
    if (!rawUrl) {
      throw new Error("Playlist URL cannot be empty.");
    }

    const listParam = rawUrl.match(/[?&]list=([^&#]+)/i);
    if (!listParam || !listParam[1]) {
      throw new Error("Invalid URL. A YouTube playlist URL must contain the 'list=' parameter.");
    }

    const listId = listParam[1];

    try {
      const cleanUrl = `https://www.youtube.com/playlist?list=${listId}`;
      const videos = await extractVideosFromHtml(cleanUrl);
      
      if (videos.length === 0) {
        throw new Error("No videos found. Ensure the playlist is Public or Unlisted (not Private).");
      }

      return { videos };
    } catch (e: any) {
      throw new Error(e.message || "An unexpected error occurred during extraction.");
    }
  }
);
