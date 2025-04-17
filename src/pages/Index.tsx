
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { awsService } from '@/services/awsService';
import { supabase } from '@/integrations/supabase/client';
import InstanceDetails from '@/components/InstanceDetails';
import { Database } from '@/integrations/supabase/types';

// Type definition for EC2 instances
type EC2Instance = {
  id: string;
  instance_id: string;
  name: string;
  status: "running" | "stopped" | "terminated";
  type: string;
  launch_time: string;
  created_at?: string | null;
  updated_at?: string | null;
  user_id?: string | null;
};

const Index = () => {
  const { user, profile, signOut, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<EC2Instance[]>([]);
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);
  const [instanceName, setInstanceName] = useState('');
  const [instanceType, setInstanceType] = useState('t2.micro');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  
  // Dashboard statistics
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    stopped: 0,
    terminated: 0
  });
  
  // Chart data
  const [cpuUsageData, setCpuUsageData] = useState<any[]>([]);
  
  useEffect(() => {
    if (user) {
      fetchInstances();
      
      // Set up real-time subscription to instance changes
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
      const { data, error } = await supabase
        .from('ec2_instances')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
        
      // Ensure the data matches our EC2Instance type
      const typedInstances: EC2Instance[] = data.map(instance => ({
        ...instance,
        status: instance.status as "running" | "stopped" | "terminated"
      }));
      
      setInstances(typedInstances);
      
      // Update stats
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
      
      // Generate some dummy CPU usage data for the chart
      const now = new Date();
      const cpuData = Array.from({ length: 10 }, (_, i) => {
        const date = new Date(now);
        date.setMinutes(date.getMinutes() - (9 - i) * 30);
        return {
          timestamp: date.toLocaleTimeString(),
          value: Math.floor(Math.random() * 60) + 10 // Random value between 10-70%
        };
      });
      
      setCpuUsageData(cpuData);
      
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast({
        title: "Error",
        description: "Failed to load EC2 instances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const launchInstance = async () => {
    if (!instanceName) {
      toast({
        title: "Error",
        description: "Please enter an instance name",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      await awsService.launchInstance(instanceName, instanceType);
      
      toast({
        title: "Instance Launched",
        description: `New EC2 instance ${instanceName} is now running`,
      });
      
      setShowLaunchDialog(false);
      setInstanceName('');
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to launch instance",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
  
  // If auth is loading, show loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If no user is logged in, redirect to auth page
  if (!user) {
    navigate('/auth');
    return null;
  }

  // Dashboard when logged in
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">AWS EC2 Manager</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {profile?.full_name || user.email}
            </span>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/profile')}
              >
                Profile
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/billing')}
              >
                Billing
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Dashboard Stats */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">
                  Running Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.running}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">
                  Stopped Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.stopped}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600">
                  Terminated Instances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.terminated}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Usage Overview Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Resource Usage Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ChartContainer
                config={{
                  cpuUsage: {
                    label: "CPU Usage",
                    color: "#2563eb"
                  }
                }}
              >
                <AreaChart data={cpuUsageData}>
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <ChartTooltipContent>
                            <div>
                              <p>
                                CPU Usage: <span className="font-medium">{payload[0].value}%</span>
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
                    stroke="#2563eb"
                    fill="url(#cpu-gradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="cpu-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your EC2 Instances</h2>
            
            <AlertDialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
              <AlertDialogTrigger asChild>
                <Button>Launch New Instance</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Launch EC2 Instance</AlertDialogTitle>
                  <AlertDialogDescription>
                    Configure your new EC2 instance below.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Instance Name</Label>
                    <Input 
                      id="name" 
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                      placeholder="My Instance"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Instance Type</Label>
                    <Select 
                      value={instanceType} 
                      onValueChange={setInstanceType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="t2.micro">t2.micro (1 vCPU, 1 GiB RAM)</SelectItem>
                        <SelectItem value="t2.small">t2.small (1 vCPU, 2 GiB RAM)</SelectItem>
                        <SelectItem value="t2.medium">t2.medium (2 vCPU, 4 GiB RAM)</SelectItem>
                        <SelectItem value="t2.large">t2.large (2 vCPU, 8 GiB RAM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={launchInstance}>
                    Launch Instance
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instance ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Launch Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : instances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No instances found. Launch your first instance to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  instances.map((instance) => (
                    <TableRow key={instance.id}>
                      <TableCell>
                        <button 
                          onClick={() => setSelectedInstanceId(instance.id)}
                          className="text-blue-600 hover:underline"
                        >
                          {instance.instance_id}
                        </button>
                      </TableCell>
                      <TableCell>{instance.name}</TableCell>
                      <TableCell>{instance.type}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          instance.status === 'running' ? 'bg-green-100 text-green-800' :
                          instance.status === 'stopped' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {instance.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(instance.launch_time).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {instance.status !== 'terminated' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
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
          
          {/* Instance Details Sheet */}
          <Sheet 
            open={selectedInstanceId !== null} 
            onOpenChange={(open) => {
              if (!open) setSelectedInstanceId(null);
            }}
          >
            <SheetContent side="right" className="sm:max-w-2xl">
              {selectedInstanceId && (
                <InstanceDetails 
                  instanceId={selectedInstanceId}
                  onClose={() => setSelectedInstanceId(null)}
                  onTerminate={terminateInstance}
                />
              )}
            </SheetContent>
          </Sheet>
        </div>
      </main>
    </div>
  );
};

export default Index;
