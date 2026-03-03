'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConsultationHistoryTab } from './ConsultationHistoryTab';
import { FavoritesTab } from './FavoritesTab';
import { ReferralLinkCard } from './ReferralLinkCard';
import { DeleteAccountButton } from './DeleteAccountButton';
import { DataExportButton } from './DataExportButton';
import type { UserProfile } from '@/types';

interface ProfilePageProps {
  userProfile: UserProfile;
}

type TabValue = 'consultorias' | 'favoritos';

/**
 * ProfilePage — main client component for /profile
 *
 * - Tab switching between "Consultorias" and "Favoritos" (AC #2)
 * - Displays user display name (or email fallback) in header (AC #8)
 * - Gender-themed design based on gender_preference (AC #8)
 * - Responsive layout: single column mobile, max-width 1200px centered (AC #10)
 */
export function ProfilePage({ userProfile }: ProfilePageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Local state for active tab (synced with URL params for shareable URLs)
  const urlTab = (searchParams.get('tab') as TabValue) ?? 'consultorias';
  const [activeTab, setActiveTab] = useState<TabValue>(urlTab);

  // Sync from URL when it changes (back/forward navigation)
  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  // Display name: prefer displayName, fall back to email
  const displayName = userProfile.displayName ?? userProfile.email ?? 'Utilizador';

  // Gender theming: dark for male, light for female, neutral if null
  const genderTheme = userProfile.genderPreference ?? null;

  const handleTabChange = (value: string) => {
    const tabValue = value as TabValue;
    setActiveTab(tabValue);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabValue);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      className="min-h-screen bg-background"
      data-gender={genderTheme ?? undefined}
    >
      {/* Profile header */}
      <header className="w-full max-w-[1200px] mx-auto px-4 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="size-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {genderTheme === 'male'
                ? 'Perfil Masculino'
                : genderTheme === 'female'
                ? 'Perfil Feminino'
                : 'Perfil'}
            </p>
          </div>
        </div>
      </header>

      {/* Tab navigation + content */}
      <main className="w-full max-w-[1200px] mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="px-4 pt-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="consultorias" className="flex-1 sm:flex-none">
                Consultorias
              </TabsTrigger>
              <TabsTrigger value="favoritos" className="flex-1 sm:flex-none">
                Favoritos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="consultorias">
            <ConsultationHistoryTab />
          </TabsContent>

          <TabsContent value="favoritos">
            <FavoritesTab />
          </TabsContent>
        </Tabs>

        {/* Story 9-5: Referral link card below the tabs (AC #6) */}
        <div className="px-4 py-6">
          <ReferralLinkCard />
        </div>

        {/* Story 11-3 + 11-4: Account settings / danger zone */}
        <div className="px-4 pb-8">
          <div className="w-full max-w-[1200px] mx-auto">
            <div className="border-t border-border pt-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Definicoes da conta
              </h2>
              {/* Story 11-4: Data export button (LGPD right to access) */}
              <div className="mb-3">
                <DataExportButton />
              </div>
              {/* Story 11-3: Delete account button (LGPD right to deletion) */}
              <DeleteAccountButton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
