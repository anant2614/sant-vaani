import { createYouTubeClient } from './core/index.ts';
import { env } from './env.ts';

export const youtubeClient = () => createYouTubeClient(env('YOUTUBE_API_KEY'));
