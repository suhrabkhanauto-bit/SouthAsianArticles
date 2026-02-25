import { Newspaper, ClipboardList, Zap, LogOut, Database } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Articles", url: "/", icon: Newspaper },
  { title: "Production Logs", url: "/logs", icon: ClipboardList },
  { title: "Data Export", url: "/export", icon: Database },
];

export function AppSidebar() {
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">
              Content Studio
            </p>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">
              Production Hub
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-4">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
                      activeClassName="bg-primary/15 text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="group-data-[collapsible=icon]:hidden">
          <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name || user?.email}</p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start gap-2 text-xs text-sidebar-foreground/60 hover:text-destructive mt-1">
          <LogOut className="h-3.5 w-3.5" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
