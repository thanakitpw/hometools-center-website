/**
 * Remounts on every navigation within (site), so the enter animation replays
 * per route. Stays a Server Component — the animation is pure CSS.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter">{children}</div>;
}
