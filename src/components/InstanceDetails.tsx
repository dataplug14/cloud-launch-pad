
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { awsService } from '@/services/awsService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface InstanceDetailsProps {
  instanceId: string;
  onClose: () => void;
  onTerminate: (id: string) => void;
}

const InstanceDetails = ({ instanceId, onClose, onTerminate }: InstanceDetailsProps) => {
  const [instance, setInstance] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchInstanceData();
    
    // Set up a real-time subscription to updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'usage_statistics'
        },
        (payload) => {
          if (payload.new.instance_id === instanceId) {
            setStats((prevStats) => [payload.new, ...prevStats].slice(0, 10));
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId]);
  
  const fetchInstanceData = async () => {
    try {
      setLoading(true);
      
      // Get instance details
      const { data: instanceData, error: instanceError } = await supabase
        .from('ec2_instances')
        .select('*')
        .eq('id', instanceId)
        .single();
      
      if (instanceError) throw instanceError;
      
      setInstance(instanceData);
      
      // Get usage statistics
      const statsData = await awsService.getInstanceStats(instanceId);
      setStats(statsData);
      
    } catch (error) {
      console.error('Error fetching instance data:', error);
      toast({
        title: "Error",
        description: "Failed to load instance details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleTerminate = () => {
    onTerminate(instanceId);
    onClose();
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!instance) {
    return (
      <div className="p-8 text-center">
        <p>Instance not found</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    );
  }
  
  // Format data for charts
  const cpuData = stats.map(stat => ({
    timestamp: new Date(stat.timestamp).toLocaleTimeString(),
    value: stat.cpu_usage
  })).reverse();
  
  const memoryData = stats.map(stat => ({
    timestamp: new Date(stat.timestamp).toLocaleTimeString(),
    value: stat.memory_usage
  })).reverse();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{instance.name}</h2>
        <div className="space-x-2">
          {instance.status !== 'terminated' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Terminate</Button>
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
                  <AlertDialogAction onClick={handleTerminate}>
                    Terminate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instance Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="font-medium">Instance ID</dt>
                <dd>{instance.instance_id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Type</dt>
                <dd>{instance.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Status</dt>
                <dd>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    instance.status === 'running' ? 'bg-green-100 text-green-800' :
                    instance.status === 'stopped' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {instance.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Launch Time</dt>
                <dd>{new Date(instance.launch_time).toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>CPU Usage</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {cpuData.length > 0 ? (
              <ChartContainer
                config={{
                  cpuUsage: {
                    label: "CPU Usage",
                    color: "#2563eb"
                  }
                }}
              >
                <AreaChart data={cpuData}>
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
                          <ChartTooltipContent
                            content={
                              <div>
                                <p>
                                  CPU Usage: <span className="font-medium">{payload[0].value}%</span>
                                </p>
                              </div>
                            }
                          />
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
            ) : (
              <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground">No CPU data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {memoryData.length > 0 ? (
              <ChartContainer
                config={{
                  memoryUsage: {
                    label: "Memory Usage",
                    color: "#8b5cf6"
                  }
                }}
              >
                <AreaChart data={memoryData}>
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
                          <ChartTooltipContent
                            content={
                              <div>
                                <p>
                                  Memory Usage: <span className="font-medium">{payload[0].value}%</span>
                                </p>
                              </div>
                            }
                          />
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="memoryUsage"
                    stroke="#8b5cf6"
                    fill="url(#memory-gradient)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="memory-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground">No memory data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Network Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Network In</span>
                  <span>
                    {stats.length > 0 ? `${stats[0].network_in.toFixed(2)} MB/s` : "N/A"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${Math.min(stats.length > 0 ? stats[0].network_in : 0, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Network Out</span>
                  <span>
                    {stats.length > 0 ? `${stats[0].network_out.toFixed(2)} MB/s` : "N/A"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full" 
                    style={{ width: `${Math.min(stats.length > 0 ? stats[0].network_out : 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstanceDetails;
