'use server';
/**
 * @fileOverview A robust programmatic fetcher to extract video information from a YouTube playlist URL.
 * 
 * - fetchYoutubePlaylist - Extracts video titles and URLs from a playlist without using LLM reasoning.
 * - Supports Public and Unlisted playlists by parsing ytInitialData with recursive deep-search.
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
 * Recursively searches an object to find a key.
 * Used to find the playlist contents regardless of where they are in the JSON tree.
 */
function findPlaylistContents(obj: any): any[] | null {
  if (!obj || typeof obj !== 'object') return null;
  
  // Look for the specific renderer that contains playlist videos
  if (obj.playlistVideoListRenderer && Array.isArray(obj.playlistVideoListRenderer.contents)) {
    return obj.playlistVideoListRenderer.contents;
  }

  // Also check for the alternative structure sometimes used in unlisted/mobile views
  if (obj.playlistVideoRenderer) {
    // If we are at an individual renderer level, this isn't the list we want
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const result = findPlaylistContents(obj[key]);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * Programmatically extracts playlist data from YouTube HTML.
 */
async function extractVideosFromHtml(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`YouTube returned status ${response.status}`);
    const html = await response.text();

    // The data is embedded in a global JS variable. We check multiple possible patterns.
    const patterns = [
      /var ytInitialData = ({.*?});/s,
      /window\["ytInitialData"\] = ({.*?});/s,
      /ytInitialData = ({.*?});/s
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
      console.error("Extraction error: Could not find or parse ytInitialData.");
      return [];
    }
    
    // Use recursive search to find the video contents
    const contents = findPlaylistContents(jsonData) || [];
    
    const videos = contents
      .map((item: any) => {
        const videoRenderer = item.playlistVideoRenderer;
        if (!videoRenderer) return null;

        const videoId = videoRenderer.videoId;
        const title = videoRenderer.title?.runs?.[0]?.text || 
                      videoRenderer.title?.simpleText || 
                      "Untitled Video";
        
        return {
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`
        };
      })
      .filter((v: any) => v !== null);

    return videos;
  } catch (error: any) {
    console.error("Network or Parsing error:", error.message);
    throw new Error(`Connection failed: ${error.message}`);
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
    let targetUrl = input.url;
    
    // Basic validation
    if (!targetUrl.includes('list=')) {
      throw new Error("Invalid playlist URL. Must contain 'list=' parameter.");
    }

    try {
      const urlObj = new URL(targetUrl);
      const listId = urlObj.searchParams.get('list');
      const cleanUrl = `https://www.youtube.com/playlist?list=${listId}`;

      const videos = await extractVideosFromHtml(cleanUrl);
      
      if (videos.length === 0) {
        throw new Error("No videos found. Ensure the playlist is Public or Unlisted.");
      }

      return { videos };
    } catch (e: any) {
      throw new Error(e.message || "An unexpected error occurred during import.");
    }
  }
);
