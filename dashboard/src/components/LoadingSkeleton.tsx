export default function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#2A2D37] rounded ${className}`} />
  );
}
