import { IconBriefcase } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function EmptyJobSelection() {
  return (
    <Empty className="pt-16 flex-1 min-h-[calc(100vh-4rem)] h-full bg-muted/30 rounded-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconBriefcase className="h-10 w-10 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>Selecciona una vacante</EmptyTitle>
        <EmptyDescription className="max-w-xs text-pretty">
          Aún no has seleccionado ninguna vacante. Elige una de la lista para
          visualizar sus detalles aquí.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">Explorar vacantes</Button>
      </EmptyContent>
    </Empty>
  );
}
