import { cn } from "@/lib/utils";

interface HeadingProps {
  title: string;
  description: string;
  className?: string;
  classNameOverride?: string;
}

export function Heading({
  title,
  description,
  className = "text-3xl font-bold tracking-tight",
  classNameOverride,
}: HeadingProps) {
  return (
    <div>
      <h1 className={cn(className, classNameOverride)}>{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
