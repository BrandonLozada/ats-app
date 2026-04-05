import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function UnauthorizedPage() {
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyTitle>401 - Unauthorized</EmptyTitle>
        <EmptyDescription>No estás autorizado.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <EmptyDescription>
          ¿Necesitas ayuda? <a href="#">Contactar a soporte</a>
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
