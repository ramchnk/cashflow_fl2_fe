
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Package,
  Receipt,
} from "lucide-react"

import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export default function AppSidebar() {
  const pathname = usePathname()

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/purchase", label: "Purchase", icon: Package },
    { href: "/expenses", label: "Expenses", icon: Receipt },
  ]

  return (
    <>
      <div
        className={cn(
          "flex h-16 shrink-0 items-center justify-between px-4",
          "group-data-[collapsible=icon]:justify-center"
        )}
      >
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <h2 className="text-lg font-medium">LedgerLink</h2>
        </div>
        <SidebarTrigger className="hidden md:flex" />
      </div>
      <SidebarContent>
        <SidebarMenu>
          {navLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === link.href}
                  tooltip={link.label}
                >
                  <link.icon />
                  <span>{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  )
}
