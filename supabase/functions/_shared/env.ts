/** Reads a setting the function cannot run without. */
export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set. Add it with: npx supabase secrets set ${name}=...`);
  return value;
}
