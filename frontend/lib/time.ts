/**
 * Format an ISO timestamp into a human-readable relative string.
 *   just now / X min ago / X hr ago / MMM D, YYYY
 */
export function relativeTime(iso: string): string {
  const now = Date.now();
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return iso;

  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
