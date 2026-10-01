import { sparkline } from "@/lib/history";

// A zone's scores on a fixed 1-10 scale. Months without a score break the
// line rather than dropping to zero. `emphasis` draws it in ink; otherwise it
// is context in grey.
export default function ZoneSpark({
  series,
  width,
  height,
  emphasis,
  ariaLabel,
}: {
  series: (number | null)[];
  width: number;
  height: number;
  emphasis: boolean;
  ariaLabel: string;
}) {
  const { segments, end } = sparkline(series, width, height);
  const stroke = emphasis ? "var(--color-ink)" : "var(--color-heat-2)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="block shrink-0">
      <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="var(--color-line)" strokeWidth="1" />
      {segments.map((pts, i) =>
        pts.includes(" ") ? (
          <polyline key={i} points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ) : (
          <circle key={i} cx={pts.split(",")[0]} cy={pts.split(",")[1]} r="2" fill={stroke} />
        )
      )}
      {end && <circle cx={end.x} cy={end.y} r="4" fill={stroke} stroke="var(--color-paper)" strokeWidth="2" />}
    </svg>
  );
}
