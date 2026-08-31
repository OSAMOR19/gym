/**
 * /profile → /settings — the profile now lives inside Settings.
 * Kept as a redirect so old links, bookmarks, and muscle memory still work.
 */

import { redirect } from 'next/navigation';

export default function ProfileRedirect() {
    redirect('/settings');
}
