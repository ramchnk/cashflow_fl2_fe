
import { Sidebar, SidebarInset } from "@/components/ui/sidebar"
import Header from "@/components/layout/header"
import AppSidebar from "./sidebar"

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </>
  )
}
