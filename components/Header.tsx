"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, BookOpen, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { href: "/scanner", label: "Scanner", icon: Camera },
  { href: "/galerie", label: "Galerie", icon: BookOpen },
  { href: "/dashboard", label: "Mes choix", icon: User },
];

export function Header() {
  const pathname = usePathname();
  const { prenom, logout } = useAuth();

  return (
    <header className="hidden md:flex items-center justify-between px-6 py-3 bg-background-light border-b border-border">
      <Link href="/galerie" className="text-accent font-bold text-lg">
        Bibliothèque JPG
      </Link>
      <nav className="flex items-center gap-6">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                active ? "text-accent" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-4">
        <span className="text-text-secondary text-sm">{prenom}</span>
        <button
          onClick={logout}
          className="text-text-muted hover:text-error transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
