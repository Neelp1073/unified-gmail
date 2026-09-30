import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ConnectAccountDialogHost } from "@/components/accounts/ConnectAccountDialogHost";

export function Shell() {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ToastViewport />
      <ConfirmDialog />
      <ConnectAccountDialogHost />
    </div>
  );
}
