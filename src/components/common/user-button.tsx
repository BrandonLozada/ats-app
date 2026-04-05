"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IconChevronDown,
  IconLogin,
  IconLogout,
  IconSettings,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logOutAction } from "@/interfaces/http/actions/auth.actions";
import { UserDetailUI } from "@/interfaces/ui/types/user/user.types";

interface UserButtonProps {
  user: UserDetailUI | null;
}

export default function UserButton({ user }: UserButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const avatarUrl = user?.image || "/images/default-avatar.png";
  const userName = user?.name || user?.email?.split("@")[0] || "Usuario";

  const handleLogout = () => {
    setOpen(false);

    startTransition(async () => {
      await logOutAction();
      toast.success("Sesión cerrada");
      setOpen(false);
      router.push("/login");
    });
  };

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar>
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback>
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">Abrir menú de usuario</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Hola, {userName}</DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <IconUser size={16} />
                Cuenta
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem disabled>
              <IconSettings size={16} />
              Ajustes
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={handleLogout}
            disabled={pending}
            variant="destructive"
          >
            <IconLogout size={16} />
            {pending ? "Saliendo..." : "Salir"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="flex lg:hidden items-center gap-2">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              Acceder
              <IconChevronDown
                className={`ml-1 h-4 w-4 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/login" className="flex items-center gap-2">
                <IconLogin size={16} />
                Entrar
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild variant="default">
              <Link href="/register" className="flex items-center gap-2">
                <IconUserPlus size={16} />
                Crear cuenta
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex items-center gap-2">
        <Button variant="secondary" size="sm" asChild>
          <Link href="/login" className="flex items-center gap-2">
            <IconLogin size={16} />
            Entrar
          </Link>
        </Button>

        <Button size="sm" asChild>
          <Link href="/register" className="flex items-center gap-2">
            <IconUserPlus size={16} />
            Crear cuenta
          </Link>
        </Button>
      </div>
    </>
  );
}
