import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "@/components/layout/Shell";
import { DashboardPage } from "@/pages/DashboardPage";
import { MailboxPage } from "@/pages/MailboxPage";
import { SearchPage } from "@/pages/SearchPage";
import { ComposePage } from "@/pages/ComposePage";
import { AttachmentsPage } from "@/pages/AttachmentsPage";
import { StoragePage } from "@/pages/StoragePage";
import { DrivePage } from "@/pages/DrivePage";
import { CleanupPage } from "@/pages/CleanupPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { MessageViewerPage } from "@/pages/MessageViewerPage";
import { useHydrateApp } from "@/hooks/useHydrateApp";
import { useThemeSync } from "@/hooks/useThemeSync";
import { Skeleton } from "@/components/ui/Skeleton";

export function App() {
  const ready = useHydrateApp();
  useThemeSync();

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="w-80 space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="inbox" element={<MailboxPage mailbox="inbox" />} />
          <Route path="all" element={<MailboxPage mailbox="all" />} />
          <Route path="starred" element={<MailboxPage mailbox="starred" />} />
          <Route path="sent" element={<MailboxPage mailbox="sent" />} />
          <Route path="trash" element={<MailboxPage mailbox="trash" />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="compose" element={<ComposePage />} />
          <Route path="files" element={<AttachmentsPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="drive" element={<DrivePage />} />
          <Route path="cleanup" element={<CleanupPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="mail/:accountId/:messageId" element={<MessageViewerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
