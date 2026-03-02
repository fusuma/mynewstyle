import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfilePage } from '@/components/profile/ProfilePage';
import type { UserProfile } from '@/types';

/**
 * Fetches the authenticated user's profile data.
 * Exported for testability (auth guard logic).
 *
 * - Returns profile data if authenticated
 * - Calls redirect('/login?redirect=/profile') if not authenticated
 */
export async function getProfileData(): Promise<{
  userId: string;
  userProfile: UserProfile;
} | undefined> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login?redirect=/profile');
    return undefined;
  }

  // Fetch profile data from the profiles table
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, display_name, gender_preference, created_at')
    .eq('id', user.id)
    .single();

  const userProfile: UserProfile = {
    id: user.id,
    email: user.email,
    displayName: profileData?.display_name ?? user.user_metadata?.display_name ?? null,
    genderPreference: (profileData?.gender_preference ?? null) as 'male' | 'female' | null,
    createdAt: profileData?.created_at ?? user.created_at ?? new Date().toISOString(),
  };

  return { userId: user.id, userProfile };
}

/**
 * Profile page: /profile
 *
 * Server component with auth guard.
 * - Unauthenticated users are redirected to /login?redirect=/profile (AC #1)
 * - Authenticated users see the ProfilePage client component (AC #2–#10)
 */
export default async function ProfilePageRoute() {
  const data = await getProfileData();

  if (!data) {
    // This is unreachable — redirect() throws, but TypeScript needs this
    return null;
  }

  return <ProfilePage userProfile={data.userProfile} />;
}
