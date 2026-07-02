export function StatCardSkeleton() {
  return (
    <div className="glass-light rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-surface-700/50" />
        <div className="h-3 w-20 rounded bg-surface-700/50" />
      </div>
      <div className="h-7 w-12 rounded bg-surface-700/50" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-surface-700/30">
      <td className="px-5 py-4">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-surface-700/40 animate-pulse" />
          <div className="h-3 w-36 rounded bg-surface-700/30 animate-pulse [animation-delay:0.1s]" />
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="w-11 h-11 rounded-full bg-surface-700/40 animate-pulse [animation-delay:0.15s]" />
      </td>
      <td className="px-5 py-4">
        <div className="h-6 w-20 rounded-full bg-surface-700/40 animate-pulse [animation-delay:0.2s]" />
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-1">
          <div className="h-5 w-14 rounded bg-surface-700/40 animate-pulse [animation-delay:0.25s]" />
          <div className="h-5 w-16 rounded bg-surface-700/40 animate-pulse [animation-delay:0.3s]" />
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-16 rounded bg-surface-700/40 animate-pulse [animation-delay:0.35s]" />
      </td>
      <td className="px-5 py-4 text-right">
        <div className="h-4 w-20 rounded bg-surface-700/40 animate-pulse [animation-delay:0.4s] ml-auto" />
      </td>
    </tr>
  );
}

export function MobileCardSkeleton() {
  return (
    <div className="glass-light rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-surface-700/40" />
          <div className="h-3 w-36 rounded bg-surface-700/30 [animation-delay:0.1s]" />
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-700/40 [animation-delay:0.15s]" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <div className="h-5 w-14 rounded bg-surface-700/40 [animation-delay:0.2s]" />
          <div className="h-5 w-16 rounded bg-surface-700/40 [animation-delay:0.25s]" />
        </div>
        <div className="h-6 w-20 rounded-full bg-surface-700/40 [animation-delay:0.3s]" />
      </div>
    </div>
  );
}
