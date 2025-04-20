
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Server, 
  PlusCircle, 
  User, 
  CreditCard, 
  LogOut 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from "@/components/ui/sidebar";

export const SideNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile, user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <SidebarProvider>
      <Sidebar className="bg-white/10 backdrop-blur-lg border-r border-white/20">
        <SidebarHeader className="p-4 border-b border-white/10">
          <h1 className="text-2xl font-bold text-gray-800">Nubis</h1>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarMenu>
            {[
              { 
                icon: <Home className="h-5 w-5" />, 
                label: "Dashboard", 
                path: "/" 
              },
              { 
                icon: <Server className="h-5 w-5" />, 
                label: "Virtual Machines", 
                path: "/virtual-machines" 
              },
              { 
                icon: <PlusCircle className="h-5 w-5" />, 
                label: "Create VM", 
                path: "/create-vm" 
              },
              { 
                icon: <User className="h-5 w-5" />, 
                label: "Profile", 
                path: "/profile" 
              },
              { 
                icon: <CreditCard className="h-5 w-5" />, 
                label: "Billing", 
                path: "/billing" 
              }
            ].map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton 
                  onClick={() => navigate(item.path)}
                  isActive={isActive(item.path)}
                  className="hover:bg-white/10 transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        
        <SidebarFooter className="p-4 border-t border-white/10">
          {user && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                {profile?.full_name || user.email}
              </div>
              <Button 
                variant="outline" 
                onClick={signOut}
                className="w-full bg-white/10 backdrop-blur-lg border-white/20 text-gray-800 hover:bg-white/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
};
