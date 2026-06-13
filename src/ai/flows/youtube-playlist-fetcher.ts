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
 * Recursively scans an object to find all instances of video data.
 * This is more robust than looking for a specific path, as YouTube often
 * changes the UI structure for Unlisted vs Public playlists.
 */
function collectAllVideos(obj: any, foundVideos: Map<string, any> = new Map()): any[] {
  if (!obj || typeof obj !== 'object') return Array.from(foundVideos.values());

  // Check for the specific video renderer
  if (obj.playlistVideoRenderer) {
    const v = obj.playlistVideoRenderer;
    const videoId = v.videoId;
    if (videoId && !foundVideos.has(videoId)) {
      const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "Untitled Video";
      foundVideos.set(videoId, {
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`
      });
    }
  }

  // Handle case where it might be in a different renderer type (rare for playlists but possible)
  if (obj.gridVideoRenderer) {
    const v = obj.gridVideoRenderer;
    const videoId = v.videoId;
    if (videoId && !foundVideos.has(videoId)) {
      const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "Untitled Video";
      foundVideos.set(videoId, {
        title,
        url: `https://www.youtube.com/watch?v=${videoId}`
      });
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x44) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`YouTube returned status ${response.status}`);
    const html = await response.text();

    const patterns = [
      /var ytInitialData = ({.*?});<\/script>/s,
      /window\["ytInitialData"\] = ({.*?});/s,
      /ytInitialData = ({.*?});/s,
      /ytInitialData\s*=\s*({.+?})\s*;/s
    ];

    let jsonData = null;
    for (const pattern of patterns) {
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

    if (!jsonData) {
      // Fallback for some unlisted pages where data is slightly different
      const alternativeMatch = html.match(/ytInitialData\s*=\s*({.+?})\s*<\/script>/s);
      if (alternativeMatch && alternativeMatch[1]) {
        try {
          jsonData = JSON.parse(alternativeMatch[1]);
        } catch (e) {}
      }
    }

    if (!jsonData) {
      throw new Error("Could not extract playlist data structure. The page might be protected or private.");
    }
    
    const videos = collectAllVideos(jsonData);
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

    // Check for list= parameter anywhere in the string
    if (!rawUrl.toLowerCase().includes('list=')) {
      throw new Error("Invalid URL. A YouTube playlist URL must contain the 'list=' parameter.");
    }

    try {
      // Fix for URLs that might not have a protocol
      const targetUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
      const urlObj = new URL(targetUrl);
      const listId = urlObj.searchParams.get('list');
      
      if (!listId) {
        throw new Error("Could not find a valid 'list' ID in the URL.");
      }

      // We use the full browse URL for unlisted playlists
      const cleanUrl = `https://www.youtube.com/playlist?list=${listId}&disable_polymer=true`;
      const videos = await extractVideosFromHtml(cleanUrl);
      
      if (videos.length === 0) {
        throw new Error("No videos found. Ensure the playlist is either Public or Unlisted (it must not be Private).");
      }

      return { videos };
    } catch (e: any) {
      throw new Error(e.message || "An unexpected error occurred while processing the playlist.");
    }
  }
);
