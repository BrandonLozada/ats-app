import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface JobListSkeletonProps {
  count?: number;
}

export default function JobListSkeleton({ count = 8 }: JobListSkeletonProps) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="rounded-none border-b last:border-b-0">
          <CardContent className="px-3 py-2 flex flex-col gap-1.5">
            {/* Title */}
            <Skeleton className="h-3.5 w-[70%]" />

            {/* Organization + Location (inline) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {/* <Skeleton className="h-3 w-3 rounded-sm" /> */}
                <Skeleton className="h-3 w-24" />
              </div>

              {/* <div className="flex items-center gap-1.5">
                <Skeleton className="h-3 w-3 rounded-sm" />
                <Skeleton className="h-3 w-16" />
              </div> */}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-1">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
