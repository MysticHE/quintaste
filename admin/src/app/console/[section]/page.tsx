import { redirect } from 'next/navigation';
import Console from '../../../components/Console';

// Addresses from before the 20 Oct 2026 regroup (Content tabs, Sellers, Controls) keep working.
const contentTabs: Record<string, string> = { places: 'places', recipes: 'recipes', events: 'events', 'member-recipes': 'member-recipes',
  reviews: 'reviews', gatherings: 'gatherings', market: 'listings' };
export default async function Page({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { section } = await params, query = await searchParams, id = typeof query.id === 'string' ? query.id : '';
  if (section === 'content') {
    const tab = typeof query.tab === 'string' ? contentTabs[query.tab] : undefined;
    redirect('/console/' + (tab ?? 'places') + (id ? '?id=' + encodeURIComponent(id) : ''));
  }
  if (section === 'sellers') redirect('/console/shops');
  if (section === 'controls') redirect('/console/features');
  return <Console section={section}/>;
}
