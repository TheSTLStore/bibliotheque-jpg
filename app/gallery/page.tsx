import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getFamilyItems } from '@/lib/notion';
import { Header } from '@/components/Header';
import { Gallery } from '@/components/Gallery';

// Cookie name must match the one in lib/auth.ts
const COOKIE_NAME = 'familyName';

export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  // Check authentication
  const cookieStore = cookies();
  const familyName = cookieStore.get(COOKIE_NAME)?.value;

  if (!familyName) {
    redirect('/');
  }

  // Fetch items from Notion
  const items = await getFamilyItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header userName={familyName} userType="family" />
      <Gallery
        initialItems={items}
        userType="family"
        userName={familyName}
      />
    </div>
  );
}
