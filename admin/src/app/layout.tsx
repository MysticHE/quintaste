import type { Metadata } from 'next';
import './tokens.css';
import './globals.css';
import './workspace.css';
import './recipes.css';
import './places.css';
import './events.css';
import './creators.css';
import './game-levels.css';

export const metadata: Metadata = { title: 'QuinTaste Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to main content</a>{children}</body></html>;
}
