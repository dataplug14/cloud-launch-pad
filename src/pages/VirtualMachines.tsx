
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { awsService } from '@/services/awsService';
import { supabase } from '@/integrations/supabase/client';
import InstanceDetailsExtended from '@/components/InstanceDetailsExtended';
import { SideNavigation } from '@/components/Sidebar';
import { Database } from '@/integrations/supabase/types';

type EC2Instance = {
  id: string;
  instance_id: string;
  name: string;
  status: "running" | "stopped" | "terminated";
  type: string;
  launch_time: string;
  storage?: number;
  location?: string;
  ipv6_enabled?: boolean;
  ssh_enabled?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  user_id?: string | null;
};

const VirtualMachines = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const [instanceLoadError, setInstanceLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      console.log('User authenticated, attempting to fetch instances...');
      
      // Add a small delay to allow AWS connection to initialize
      setTimeout(() => {
        fetchInstances().catch(error => {
          console.error('Failed to fetch instances:', error);
          setInstanceLoadError('Unable to load instances. Please check your connection or try again.');
        });
      }, 500);
      
      // Set up realtime subscription for database changes
      const channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ec2_instances'
          },
          (payload) => {
            console.log('DB change detected:', payload);
            fetchInstances();
          }
        )
        .subscribe();
        
      // Set an interval to periodically refresh instances
      const refreshInterval = setInterval(() => {
        console.log('Refreshing instances...');
        fetchInstances();
      }, 15000); // Refresh every 15 seconds
        
      return () => {
        supabase.removeChannel(channel);
        clearInterval(refreshInterval);
      };
    }
  }, [user]);
  
  const fetchInstances = async () => {
    try {
      setLoading(true);
      setInstanceLoadError(null);
      console.log('Fetching instances attempt #', fetchAttempts + 1);
      
      const instancesData = await awsService.getInstances();
      console.log('Instances data received:', instancesData);
      
      const typedInstances: EC2Instance[] = Array.isArray(instancesData) 
        ? instancesData.map(instance => ({
            ...instance,
            status: instance.status as "running" | "stopped" | "terminated"
          }))
        : [];
      
      console.log('Processed instances:', typedInstances);
      setInstances(typedInstances);
      
    } catch (error) {
      console.error('Error fetching instances:', error);
      setInstanceLoadError('Failed to retrieve instances. Please check your AWS configuration.');
    } finally {
      setLoading(false);
      setFetchAttempts(prev => prev + 1);
    }
  };

  const terminateInstance = async (instanceId: string) => {
    try {
      setLoading(true);
      console.log('Terminating instance:', instanceId);
      await awsService.terminateInstance(instanceId);
      
      toast({
        title: "Instance Terminated",
        description: `EC2 instance has been terminated`,
      });
      
      // Refresh instances after termination
      fetchInstances();
      
    } catch (error: any) {
      console.error('Error terminating instance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to terminate instance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const retryFetchInstances = () => {
    console.log('Manually retrying instance fetch...');
    setFetchAttempts(0);
    fetchInstances();
    
    toast({
      title: "Refreshing",
      description: "Refreshing instance data...",
    });
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

  if (instanceLoadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SideNavigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">
              {instanceLoadError}
            </h2>
            <Button onClick={fetchInstances} variant="outline">
              Retry Loading Instances
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <SideNavigation />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Virtual Machines</h1>
            <div className="flex gap-2">
              <Button onClick={retryFetchInstances} variant="outline" size="sm">
                Refresh Data
              </Button>
              <Button 
                onClick={() => navigate('/create-vm')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Create New VM
              </Button>
            </div>
          </div>
          
          <Card className="bg-white/50 backdrop-blur border-gray-200/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium">Instance ID</TableHead>
                  <TableHead className="font-medium">Name</TableHead>
                  <TableHead className="font-medium">Type</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium hidden md:table-cell">Location</TableHead>
                  <TableHead className="font-medium hidden lg:table-cell">Launch Time</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : instances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No instances found. Create your first instance to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  instances.map((instance) => (
                    <TableRow key={instance.id} className="hover:bg-white/50">
                      <TableCell>
                        <button 
                          onClick={() => setSelectedInstanceId(instance.id)}
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {instance.instance_id}
                        </button>
                      </TableCell>
                      <TableCell>{instance.name}</TableCell>
                      <TableCell className="font-mono text-sm">{instance.type}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          instance.status === 'running' ? 'bg-green-100 text-green-800' :
                          instance.status === 'stopped' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {instance.status}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{instance.location || 'us-east-1'}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(instance.launch_time).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {instance.status !== 'terminated' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                Terminate
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Terminate Instance</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to terminate this instance? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => terminateInstance(instance.id)}
                                >
                                  Terminate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
      
      <Sheet 
        open={selectedInstanceId !== null} 
        onOpenChange={(open) => {
          if (!open) setSelectedInstanceId(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-2xl w-[95vw]">
          {selectedInstanceId && (
            <InstanceDetailsExtended 
              instanceId={selectedInstanceId}
              onClose={() => setSelectedInstanceId(null)}
              onTerminate={terminateInstance}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default VirtualMachines;
