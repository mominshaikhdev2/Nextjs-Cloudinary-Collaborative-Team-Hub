export function SkeletonBox({ className = '' }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <SkeletonBox className="h-4 w-1/3" />
      <SkeletonBox className="h-3 w-2/3" />
      <SkeletonBox className="h-3 w-1/2" />
    </div>
  );
}