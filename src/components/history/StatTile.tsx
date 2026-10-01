// A label and a value; the value uses proportional figures at display size.
export default function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-paper-2 px-3.5 py-3">
      <p className="text-xs text-ink-2">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight text-ink">{value}</p>
    </div>
  );
}
