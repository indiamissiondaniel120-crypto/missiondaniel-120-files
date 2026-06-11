'use server';
/**
 * @fileOverview A flow to fetch and extract video information from a YouTube playlist URL.
 *
 * - fetchYoutubePlaylist - Extracts video titles and URLs from a playlist.
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

export async function fetchYoutubePlaylist(input: FetchYoutubePlaylistInput): Promise<FetchYoutubePlaylistOutput> {
  return fetchYoutubePlaylistFlow(input);
}

const fetchTool = ai.defineTool(
  {
    name: 'fetchUrlContent',
    description: 'Fetches the HTML content of a given URL.',
    inputSchema: z.object({ url: z.string() }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const response = await fetch(input.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch URL');
      return await response.text();
    } catch (error) {
      return `Error fetching URL: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
);

const playlistPrompt = ai.definePrompt({
  name: 'playlistPrompt',
  input: { schema: FetchYoutubePlaylistInputSchema },
  output: { schema: FetchYoutubePlaylistOutputSchema },
  tools: [fetchTool],
  prompt: `You are a YouTube metadata extractor. 
Given the playlist URL: {{{url}}}

1. Use the fetchUrlContent tool to get the content of the URL.
2. From the fetched content (which is a YouTube playlist page), identify all the videos in the list.
3. Extract the title of each video and its full URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID).
4. Return the list of videos.

If the tool fails or you cannot find videos, return an empty list. 
Focus on extracting the real video titles and IDs from the HTML data (look for "videoRenderer" or "playlistVideoRenderer" patterns in the JSON-like strings in the HTML).`,
});

const fetchYoutubePlaylistFlow = ai.defineFlow(
  {
    name: 'fetchYoutubePlaylistFlow',
    inputSchema: FetchYoutubePlaylistInputSchema,
    outputSchema: FetchYoutubePlaylistOutputSchema,
  },
  async (input) => {
    const { output } = await playlistPrompt(input);
    if (!output) throw new Error('Failed to extract playlist data.');
    return output;
  }
);
