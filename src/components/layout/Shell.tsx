import type { PropsWithChildren } from "react";

interface ShellProps {
  showSidebar?: boolean;
}

export function Shell({ showSidebar = true, children }: PropsWithChildren<ShellProps>) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      {showSidebar && <aside className="hidden md:flex flex-col w-64 border-r border-border bg-background" />}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
