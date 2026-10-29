function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set. Copy apps/studio/.env.example to .env.local.`);
  return value;
}

// Read with literal names so Next can inline the public ones.
export const supabaseUrl = () => required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseKey = () =>
  required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const youtubeApiKey = () => required('YOUTUBE_API_KEY', process.env.YOUTUBE_API_KEY);
