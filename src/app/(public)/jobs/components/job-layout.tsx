import { ReactElement } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";

interface JobLayoutProps {
  filters?: ReactElement;
  list: ReactElement;
  detail: ReactElement;
}

export default function JobLayout({ filters, list, detail }: JobLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] xl:grid-cols-[260px_360px_1fr]">
      {/* Filter section */}
      <aside className="hidden xl:block border-r">
        <ScrollArea className="h-full p-4">{filters}</ScrollArea>
      </aside>

      {/* List Section */}
      <section className="border-r overflow-hidden">
        <ScrollArea className="h-full">{list}</ScrollArea>
      </section>

      {/* Detail Section */}
      {/* TODO: Aplicar un skeleton o loader de la misma forma de tarjetas de la página de JobClient. */}
      <section className="hidden lg:block overflow-hidden">
        <ScrollArea className="h-full">{detail}</ScrollArea>
      </section>
    </div>
  );
}
