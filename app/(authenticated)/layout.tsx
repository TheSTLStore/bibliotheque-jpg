import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Toaster } from "sonner";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <BottomNav />
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "#1f2544",
            border: "1px solid #2a2a4a",
            color: "#e8e0d6",
          },
        }}
      />
    </div>
  );
}
