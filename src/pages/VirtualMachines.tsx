
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Power, 
  Edit, 
  Trash2 
} from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { SideNavigation } from '@/components/Sidebar';
import { useQuery } from '@tanstack/react-query';
import { fetchVirtualMachines } from '@/services/awsService';

const VirtualMachines = () => {
  const { user } = useAuth();
  const { 
    data: instances, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['virtualMachines'],
    queryFn: () => fetchVirtualMachines(user?.id),
    enabled: !!user
  });

  const handleStartVM = (instanceId: string) => {
    toast({
      title: "Starting VM",
      description: `Starting instance ${instanceId}`
    });
  };

  const handleStopVM = (instanceId: string) => {
    toast({
      title: "Stopping VM",
      description: `Stopping instance ${instanceId}`
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Error loading virtual machines</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <SideNavigation />
      
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-6">Virtual Machines</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances?.map((instance) => (
            <Card 
              key={instance.id} 
              className="bg-white/80 backdrop-blur border border-white/20"
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  {instance.name}
                </CardTitle>
                <span 
                  className={`px-2 py-1 rounded-full text-xs ${
                    instance.status === 'running' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {instance.status}
                </span>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <p>ID: {instance.id}</p>
                  <p>Type: {instance.type}</p>
                  <p>Region: {instance.region}</p>
                  
                  <div className="flex space-x-2 pt-4">
                    {instance.status === 'running' ? (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleStopVM(instance.id)}
                      >
                        <Power className="mr-2 h-4 w-4" /> Stop
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleStartVM(instance.id)}
                      >
                        <Power className="mr-2 h-4 w-4" /> Start
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default VirtualMachines;
