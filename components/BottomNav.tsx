"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/scanner", label: "Scanner", icon: Camera },
  { href: "/galerie", label: "Galerie", icon: BookOpen },
  { href: "/dashboard", label: "Mes choix", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background-light border-t border-border md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                active ? "text-accent" : "text-text-muted"
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
