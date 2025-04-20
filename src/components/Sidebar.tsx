
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User, CreditCard, Server, LogOut, PlusCircle } from 'lucide-react';
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
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";

export const SideNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile, user } = useAuth();

  // Check if the current path matches the navigation item
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-full">
        <div className="md:hidden fixed top-4 left-4 z-50">
          <SidebarTrigger />
        </div>
        
        <Sidebar className="border-r border-gray-200 bg-gray-900 text-white">
          <SidebarHeader className="pb-0">
            <div className="px-4 py-5">
              <h1 className="text-2xl font-bold text-white">
                Nubis
              </h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/')}
                  tooltip="Dashboard"
                  className="py-3"
                  isActive={isActive('/')}
                >
                  <Home className="h-5 w-5" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/virtual-machines')}
                  tooltip="Virtual Machines"
                  className="py-3"
                  isActive={isActive('/virtual-machines')}
                >
                  <Server className="h-5 w-5" />
                  <span>Virtual Machines</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/create-vm')}
                  tooltip="Create VM"
                  className="py-3"
                  isActive={isActive('/create-vm')}
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>Create VM</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/profile')}
                  tooltip="Profile"
                  className="py-3"
                  isActive={isActive('/profile')}
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/billing')}
                  tooltip="Billing"
                  className="py-3"
                  isActive={isActive('/billing')}
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Billing</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter>
            <div className="px-3 py-4 border-t border-gray-700">
              {user && (
                <div className="text-sm text-gray-300 mb-2">
                  {profile?.full_name || user.email}
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="w-full justify-start bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
      </div>
    </SidebarProvider>
  );
};

