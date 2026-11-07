"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Role } from "@/lib/types";
import { Button, EmptyState } from "@/components/ui/kit";
import { useEffect } from "react";

/** Protects a page: requires auth and one of the provided roles. */
export function RequireRole({
  roles,
  redirectTo,
  children,
}: {
  roles: Role[];
  redirectTo?: string;
  children: ReactNode;
}) {
  const { user, booted } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (booted && !user) router.replace("/");
  }, [booted, user, router]);

  useEffect(() => {
    if (booted && user && roles.length > 0 && !roles.includes(user.role) && redirectTo) {
      router.replace(redirectTo);
    }
  }, [booted, user, roles, redirectTo, router]);

  if (!booted || !user) {
    return (
      <div className="space-y-3 pt-4">
        <div className="skeleton h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[104px]" />
          ))}
        </div>
        <div className="skeleton h-72" />
      </div>
    );
  }

  if (!roles.includes(user.role)) {
    return (
      <EmptyState
        icon={<ShieldAlert size={26} />}
        title="Недостаточно прав"
        description="Этот раздел доступен только для определённых ролей в системе. Обратитесь к администратору, если вам нужен доступ."
        action={
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft size={15} />
            Вернуться назад
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
