'use server';
/**
 * @fileOverview A robust programmatic fetcher to extract video information from a YouTube playlist URL.
 * 
 * - fetchYoutubePlaylist - Extracts video titles and URLs from a playlist without using LLM reasoning.
 * - Supports Public and Unlisted playlists by parsing ytInitialData.
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
    // If we are at an individual renderer level, this isn't the list we want, 
    // we want the parent array. But we continue searching.
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
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();

    // The data is embedded in a global JS variable
    const regex = /var ytInitialData = ({.*?});/s;
    const match = html.match(regex);

    if (!match || !match[1]) {
      console.error("Could not find ytInitialData. YouTube might be blocking the request or the layout changed.");
      return [];
    }

    const data = JSON.parse(match[1]);
    
    // Use recursive search to find the video contents
    const contents = findPlaylistContents(data) || [];
    
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
  } catch (error) {
    console.error("Extraction error:", error);
    return [];
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

    // Clean URL to avoid weird mobile redirects or tracking params
    const urlObj = new URL(targetUrl);
    const listId = urlObj.searchParams.get('list');
    const cleanUrl = `https://www.youtube.com/playlist?list=${listId}`;

    const videos = await extractVideosFromHtml(cleanUrl);
    
    if (videos.length === 0) {
      throw new Error("No videos found. The playlist might be private (not unlisted) or YouTube is temporarily blocking requests.");
    }

    return { videos };
  }
);
