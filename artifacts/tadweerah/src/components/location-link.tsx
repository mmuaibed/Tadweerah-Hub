import React from "react";
import { buildMapsUrl } from "@/lib/maps";
import { useT } from "@/i18n";

interface LocationLinkProps {
  address: string | null | undefined;
  city?: string | null;
  mapsUrl?: string | null;
  /** Call e.stopPropagation() on click — use inside clickable cards */
  stopPropagation?: boolean;
  className?: string;
}

/**
 * Renders a location address as a clickable Google Maps link.
 *
 * - If `mapsUrl` is a valid https URL, it is used directly.
 * - Otherwise a fallback search URL is built from address + city.
 * - Returns null when address is empty.
 */
export function LocationLink({
  address,
  city,
  mapsUrl,
  stopPropagation,
  className,
}: LocationLinkProps) {
  const { t } = useT();
  if (!address) return null;

  const resolvedUrl = buildMapsUrl(mapsUrl, address, city);
  const handleClick = stopPropagation
    ? (e: React.MouseEvent) => e.stopPropagation()
    : undefined;

  return (
    <span className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className ?? ""}`}>
      {resolvedUrl ? (
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          onClick={handleClick}
        >
          {address}
        </a>
      ) : (
        <span>{address}</span>
      )}
      {resolvedUrl && (
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium hover:underline shrink-0 not-italic"
          onClick={handleClick}
        >
          ↗ {t("listing.location.open_maps")}
        </a>
      )}
    </span>
  );
}
