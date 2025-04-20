
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LaunchInstanceForm from '@/components/LaunchInstanceForm';
import { SideNavigation } from '@/components/Sidebar';

const CreateVM = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleLaunchFormSuccess = (instanceDetails: any) => {
    toast({
      title: "Instance Created",
      description: `Your new VM ${instanceDetails.name} is being launched.`
    });
    
    navigate('/virtual-machines');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <SideNavigation />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Create Virtual Machine</h1>
          
          <Card className="bg-white/80 backdrop-blur border border-white/20">
            <CardHeader>
              <CardTitle className="text-xl">Configure New VM</CardTitle>
            </CardHeader>
            <CardContent>
              <LaunchInstanceForm onSuccess={handleLaunchFormSuccess} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateVM;
