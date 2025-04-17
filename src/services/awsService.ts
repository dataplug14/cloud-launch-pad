
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type EC2Instance = Database['public']['Tables']['ec2_instances']['Row'];
type UsageStatistic = Database['public']['Tables']['usage_statistics']['Row'];

// Extended launch options interface
interface LaunchInstanceOptions {
  storage?: number;
  cpu?: number;
  memory?: number;
  location?: string;
  enableIpv6?: boolean;
  username?: string;
  password?: string;
  enableSsh?: boolean;
  sshKey?: string;
  userData?: string;
}

// This is a simulated cloud service that would actually call cloud APIs
// In a real implementation, you would use appropriate SDK or call your backend APIs
export const awsService = {
  // Get all instances for current user
  getInstances: async (): Promise<EC2Instance[]> => {
    const { data, error } = await supabase
      .from('ec2_instances')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching instances:', error);
      throw error;
    }
    
    return data || [];
  },
  
  // Launch a new instance with extended options
  launchInstance: async (
    name: string, 
    type: string,
    options?: LaunchInstanceOptions
  ): Promise<EC2Instance> => {
    // In a real app, this would call cloud API to create an instance
    const instanceId = `i-${Math.random().toString(36).substring(2, 10)}`;
    const launchTime = new Date().toISOString();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    if (!userId) {
      throw new Error("User not authenticated");
    }
    
    // Prepare instance data with type assertion to handle additional properties
    const instanceData: any = {
      instance_id: instanceId,
      name,
      status: 'running',
      type,
      launch_time: launchTime,
      user_id: userId,
      storage: options?.storage || 20,
      cpu: options?.cpu || 1,
      memory: options?.memory || 1,
      location: options?.location || 'us-east-1',
      ipv6_enabled: options?.enableIpv6 || false,
      username: options?.username || 'admin',
      ssh_enabled: options?.enableSsh || false,
      user_data: options?.userData || null
    };
    
    // Check if we need to store password securely
    if (options?.password) {
      // In a real app, you would hash this password or use a secrets manager
      // This is just for simulation
      instanceData.password_set = true;
    }
    
    // Check if we need to store SSH key
    if (options?.sshKey && options?.enableSsh) {
      instanceData.ssh_key_set = true;
    }
    
    // Insert the instance into the database
    const { data, error } = await supabase
      .from('ec2_instances')
      .insert(instanceData)
      .select()
      .single();
    
    if (error) {
      console.error('Error launching instance:', error);
      throw error;
    }
    
    // Also insert some initial usage statistics
    await supabase
      .from('usage_statistics')
      .insert({
        instance_id: data.id,
        user_id: userId,
        cpu_usage: Math.random() * 20,
        memory_usage: Math.random() * 30,
        network_in: Math.random() * 100,
        network_out: Math.random() * 50
      });
    
    return data;
  },
  
  // SSH into an instance
  sshConnect: async (id: string, credentials?: { username?: string, password?: string, privateKey?: string }): Promise<{ sessionId: string }> => {
    // In a real app, this would establish an SSH connection
    // For simulation, we'll just return a fake session ID
    console.log(`Connecting to instance ${id} via SSH`, credentials);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { sessionId: `ssh-${Math.random().toString(36).substring(2, 10)}` };
  },
  
  // Execute SSH command
  executeCommand: async (sessionId: string, command: string): Promise<{ output: string }> => {
    console.log(`Executing command in session ${sessionId}: ${command}`);
    
    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock output based on command
    let output = '';
    
    if (command.includes('ls')) {
      output = 'app\ndata\nlogs\nnode_modules\npackage.json\nREADME.md';
    } else if (command.includes('ps')) {
      output = 'PID   USER     TIME  COMMAND\n1     root      0:00 init\n400   admin     0:02 node server.js\n500   admin     0:01 nginx';
    } else if (command.includes('df')) {
      output = 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/root       8123456 2345678   5777778  29% /';
    } else {
      output = `Command executed: ${command}`;
    }
    
    return { output };
  },
  
  // Terminate an instance
  terminateInstance: async (id: string): Promise<void> => {
    // In a real app, this would call cloud API to terminate an instance
    const { error } = await supabase
      .from('ec2_instances')
      .update({ status: 'terminated' })
      .eq('id', id);
    
    if (error) {
      console.error('Error terminating instance:', error);
      throw error;
    }
  },
  
  // Get usage statistics for an instance
  getInstanceStats: async (instanceId: string): Promise<UsageStatistic[]> => {
    const { data, error } = await supabase
      .from('usage_statistics')
      .select('*')
      .eq('instance_id', instanceId)
      .order('timestamp', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching usage statistics:', error);
      throw error;
    }
    
    return data || [];
  }
};
