import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { awsService } from '@/services/awsService';
import { supabase } from '@/integrations/supabase/client';
import { SideNavigation } from '@/components/Sidebar';

const Index = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    running: 0,
    stopped: 0,
    terminated: 0
  });
  
  const [cpuUsageData, setCpuUsageData] = useState<any[]>([]);
  
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
      
      const instancesData = await awsService.getInstances();
      
      if (Array.isArray(instancesData)) {
        const total = instancesData.length;
        const running = instancesData.filter(i => i.status === 'running').length;
        const stopped = instancesData.filter(i => i.status === 'stopped').length;
        const terminated = instancesData.filter(i => i.status === 'terminated').length;
        
        setStats({
          total,
          running,
          stopped,
          terminated
        });
        
        // Generate some dummy CPU usage data if we have instances
        if (instancesData.length > 0) {
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
        }
      }
      
    } catch (error) {
      console.error('Error fetching instances:', error);
      setInstanceLoadError('Failed to retrieve instances. Please check your AWS configuration.');
    } finally {
      setLoading(false);
    }
  };
  
  const retryFetchInstances = () => {
    fetchInstances();
    toast({
      title: "Refreshing",
      description: "Refreshing dashboard data...",
    });
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#222222] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1F2C] to-[#222222] flex">
      <SideNavigation />
      
      <main className="flex-1 p-6 pl-[16rem] md:pl-64 overflow-auto">
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <div className="flex gap-2">
              <Button onClick={retryFetchInstances} variant="outline" size="sm">
                Refresh Data
              </Button>
              <Button 
                onClick={() => navigate('/virtual-machines')}
                variant="outline"
              >
                View All VMs
              </Button>
              <Button 
                onClick={() => navigate('/create-vm')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Create New VM
              </Button>
            </div>
          </div>
          
          {instanceLoadError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <p className="font-medium">Error: {instanceLoadError}</p>
              <Button onClick={fetchInstances} variant="outline" size="sm" className="mt-2">
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">
                      Total Instances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-8 flex items-center">
                        <div className="w-8 h-4 bg-gray-200/20 animate-pulse rounded"></div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-white">{stats.total}</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-400">
                      Running Instances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-8 flex items-center">
                        <div className="w-8 h-4 bg-gray-200/20 animate-pulse rounded"></div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-green-400">{stats.running}</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-400">
                      Stopped Instances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-8 flex items-center">
                        <div className="w-8 h-4 bg-gray-200/20 animate-pulse rounded"></div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-yellow-400">{stats.stopped}</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-400">
                      Terminated Instances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-8 flex items-center">
                        <div className="w-8 h-4 bg-gray-200/20 animate-pulse rounded"></div>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-red-400">{stats.terminated}</div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {stats.total > 0 && (
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">Resource Usage Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[300px] w-full p-6">
                      <ChartContainer
                        config={{
                          cpuUsage: {
                            label: "CPU Usage",
                            theme: {
                              light: "#60a5fa",
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
                            stroke="#ffffff50"
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tickFormatter={(value) => `${value}%`}
                            fontSize={12}
                            stroke="#ffffff50"
                          />
                          <ChartTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltipContent
                                    className="bg-[#1A1F2C]/95 backdrop-blur border-white/10 text-white"
                                  >
                                    <div className="px-3 py-2">
                                      <p className="text-sm font-medium">
                                        CPU Usage: <span className="text-blue-400">{payload[0].value}%</span>
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
                            stroke="#60a5fa"
                            fill="url(#cpu-gradient)"
                          />
                          <defs>
                            <linearGradient id="cpu-gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={() => navigate('/create-vm')}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Create New VM
                    </Button>
                    <Button 
                      onClick={() => navigate('/virtual-machines')}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      Manage Virtual Machines
                    </Button>
                    <Button 
                      onClick={() => navigate('/billing')}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                      View Billing
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/5 backdrop-blur-lg border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-white">System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-200/20 animate-pulse rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200/20 animate-pulse rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200/20 animate-pulse rounded w-5/6"></div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/60">System Status:</span>
                          <span className="text-sm font-medium text-green-400">Operational</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/60">API Status:</span>
                          <span className="text-sm font-medium text-green-400">Available</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-white/60">Last Updated:</span>
                          <span className="text-sm font-medium text-white/80">{new Date().toLocaleTimeString()}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
