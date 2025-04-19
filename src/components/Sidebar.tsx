
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, User, CreditCard, LogOut } from 'lucide-react';
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
  const { signOut, profile, user } = useAuth();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-full">
        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarHeader className="pb-0">
            <div className="px-4 py-5">
              <h1 className="text-2xl font-bold">
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
                >
                  <Home className="h-5 w-5" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/profile')}
                  tooltip="Profile"
                  className="py-3"
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
                >
                  <CreditCard className="h-5 w-5" />
                  <span>Billing</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter>
            <div className="px-3 py-4 border-t border-gray-200">
              {user && (
                <div className="text-sm text-gray-600 mb-2">
                  {profile?.full_name || user.email}
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="w-full justify-start"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex-1">
          {/* Main content will be rendered here by the router */}
        </div>
      </div>
    </SidebarProvider>
  );
};
