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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { awsService } from '@/services/awsService';
import { supabase } from '@/integrations/supabase/client';
import InstanceDetailsExtended from '@/components/InstanceDetailsExtended';
import LaunchInstanceForm from '@/components/LaunchInstanceForm';
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

const Index = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    stopped: 0,
    terminated: 0
  });
  
  const [cpuUsageData, setCpuUsageData] = useState<any[]>([]);
  
  useEffect(() => {
    if (user) {
      fetchInstances();
      
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
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);
  
  const fetchInstances = async () => {
    try {
      setLoading(true);
      console.log('Fetching instances...');
      const instancesData = await awsService.getInstances();
      console.log('Instances data received:', instancesData);
      
      const typedInstances: EC2Instance[] = instancesData.map(instance => ({
        ...instance,
        status: instance.status as "running" | "stopped" | "terminated"
      }));
      
      setInstances(typedInstances);
      
      const total = typedInstances.length;
      const running = typedInstances.filter(i => i.status === 'running').length;
      const stopped = typedInstances.filter(i => i.status === 'stopped').length;
      const terminated = typedInstances.filter(i => i.status === 'terminated').length;
      
      setStats({
        total,
        running,
        stopped,
        terminated
      });
      
      const now = new Date();
      const cpuData = Array.from({ length: 10 }, (_, i) => {
        const date = new Date(now);
        date.setMinutes(date.getMinutes() - (9 - i) * 30);
        return {
          timestamp: date.toLocaleTimeString(),
          value: Math.floor(Math.random() * 60) + 10
        };
      });
      
      setCpuUsageData(cpuData);
      
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast({
        title: "Error",
        description: "Failed to load instances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchFormSuccess = () => {
    setShowLaunchDialog(false);
    fetchInstances();
  };

  const terminateInstance = async (instanceId: string) => {
    try {
      setLoading(true);
      await awsService.terminateInstance(instanceId);
      
      toast({
        title: "Instance Terminated",
        description: `EC2 instance has been terminated`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to terminate instance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
      
      <main className="flex-1 p-6">
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white/50 backdrop-blur border-gray-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/50 backdrop-blur border-gray-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  Running Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.running}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/50 backdrop-blur border-gray-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">
                  Stopped Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.stopped}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/50 backdrop-blur border-gray-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  Terminated Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.terminated}</div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-white/50 backdrop-blur border-gray-200/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Resource Usage Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] w-full p-6">
                <ChartContainer
                  config={{
                    cpuUsage: {
                      label: "CPU Usage",
                      theme: {
                        light: "#3b82f6",
                        dark: "#60a5fa"
                      }
                    }
                  }}
                >
                  <AreaChart data={cpuUsageData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis
                      dataKey="timestamp"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      fontSize={12}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      tickFormatter={(value) => `${value}%`}
                      fontSize={12}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <ChartTooltipContent
                              className="bg-white/95 backdrop-blur border-gray-200/50"
                            >
                              <div className="px-3 py-2">
                                <p className="text-sm font-medium">
                                  CPU Usage: <span className="text-blue-600">{payload[0].value}%</span>
                                </p>
                              </div>
                            </ChartTooltipContent>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="cpuUsage"
                      strokeWidth={2}
                      fillOpacity={0.2}
                    />
                    <defs>
                      <linearGradient id="cpu-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Virtual Machines</h2>
              <AlertDialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Launch New Instance
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Launch Virtual Machine</AlertDialogTitle>
                    <AlertDialogDescription>
                      Configure your new virtual machine with the options below.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <LaunchInstanceForm onSuccess={handleLaunchFormSuccess} />
                </AlertDialogContent>
              </AlertDialog>
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
                        No instances found. Launch your first instance to get started.
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

export default Index;
