'use server';
/**
 * @fileOverview A robust programmatic fetcher to extract video information from a YouTube playlist URL.
 * 
 * - fetchYoutubePlaylist - Extracts video titles and URLs from a playlist without using LLM reasoning.
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
 * Programmatically extracts playlist data from YouTube HTML.
 * This avoids using the LLM for parsing, making it much more reliable and faster.
 */
async function extractVideosFromHtml(url: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 0 } // Ensure fresh data
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();

    // Look for the JSON object containing the playlist data
    const regex = /var ytInitialData = ({.*?});/s;
    const match = html.match(regex);

    if (!match || !match[1]) {
      console.error("Could not find ytInitialData in the page source.");
      return [];
    }

    const data = JSON.parse(match[1]);
    
    // Navigate the complex YouTube JSON structure to find the videos
    // The path varies slightly depending on the page layout, so we try the most common ones
    const sidebar = data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
    
    const contents = sidebar || [];
    
    const videos = contents
      .map((item: any) => {
        const videoRenderer = item.playlistVideoRenderer;
        if (!videoRenderer) return null;

        const videoId = videoRenderer.videoId;
        const title = videoRenderer.title?.runs?.[0]?.text || "Untitled Video";
        
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
  // We keep the Genkit Flow wrapper so the frontend code remains compatible,
  // but we perform the actual work programmatically for reliability.
  return fetchYoutubePlaylistFlow(input);
}

const fetchYoutubePlaylistFlow = ai.defineFlow(
  {
    name: 'fetchYoutubePlaylistFlow',
    inputSchema: FetchYoutubePlaylistInputSchema,
    outputSchema: FetchYoutubePlaylistOutputSchema,
  },
  async (input) => {
    // Process the URL to ensure it's a valid playlist link
    let targetUrl = input.url;
    if (!targetUrl.includes('list=')) {
      throw new Error("Invalid playlist URL. Must contain 'list=' parameter.");
    }

    const videos = await extractVideosFromHtml(targetUrl);
    
    return { videos };
  }
);
