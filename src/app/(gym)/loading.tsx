import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div
      className="loading-view"
      role="status"
      aria-label="Cargando información"
    >
      <Skeleton className="h-10 w-44" />
      <Skeleton className="h-12 w-full" />
      {[1, 2, 3, 4].map((i) => (
        <Skeleton className="h-20 w-full" key={i} />
      ))}
    </div>
  );
}
