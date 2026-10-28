import type { Scheme } from '@sant-vaani/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/auth/AuthProvider';
import { CatalogueProvider, type CatalogueOptions } from '@/catalogue/CatalogueProvider';
import { ClockProvider } from '@/clock';
import { GitaProvider } from '@/gita/GitaProvider';
import type { GitaSource } from '@/gita/types';
import { PrefsProvider } from '@/prefs/PrefsProvider';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * Everything screens read from, in dependency order. The options exist for
 * tests and screenshots; the app uses the defaults.
 */
export function AppProviders({
  clock,
  catalogue,
  openGita,
  systemScheme,
  supabase,
  children,
}: {
  clock?: () => Date;
  catalogue?: CatalogueOptions;
  openGita?: () => Promise<GitaSource>;
  systemScheme?: Scheme | null;
  supabase?: SupabaseClient | null;
  children: ReactNode;
}) {
  return (
    <ClockProvider clock={clock}>
      <PrefsProvider>
        <ThemeProvider systemScheme={systemScheme}>
          <CatalogueProvider options={catalogue}>
            <GitaProvider open={openGita}>
              <AuthProvider client={supabase}>{children}</AuthProvider>
            </GitaProvider>
          </CatalogueProvider>
        </ThemeProvider>
      </PrefsProvider>
    </ClockProvider>
  );
}
