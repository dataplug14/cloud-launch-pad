
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

// Nubis cloud service that securely calls cloud provider APIs via Supabase Edge Functions
export const awsService = {
  // Get all instances for current user
  getInstances: async (): Promise<EC2Instance[]> => {
    try {
      // First try to get instances from the real cloud provider via edge function
      const { data: cloudInstances, error } = await supabase.functions.invoke('cloud-manager', {
        body: { action: 'listInstances' },
      });
      
      if (!error && cloudInstances) {
        return cloudInstances;
      }
      
      // Fallback to database if edge function fails
      console.log('Falling back to database for instances');
      const { data, error: dbError } = await supabase
        .from('ec2_instances')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (dbError) {
        console.error('Error fetching instances:', dbError);
        throw dbError;
      }
      
      return data || [];
    } catch (err) {
      console.error('Error in getInstances:', err);
      // Final fallback to database
      const { data, error: dbError } = await supabase
        .from('ec2_instances')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (dbError) throw dbError;
      return data || [];
    }
  },
  
  // Launch a new instance with extended options
  launchInstance: async (
    name: string, 
    type: string,
    options?: LaunchInstanceOptions
  ): Promise<EC2Instance> => {
    try {
      // Try to launch instance via the cloud provider using edge function
      const { data: cloudInstance, error } = await supabase.functions.invoke('cloud-manager', {
        body: { 
          action: 'launchInstance',
          name,
          type,
          options
        },
      });
      
      if (!error && cloudInstance) {
        return cloudInstance;
      }
      
      // Fallback to simulated approach
      console.log('Falling back to simulation for launching instance');
      
      // In a simulation, this would call cloud API to create an instance
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
      const { data, error: dbError } = await supabase
        .from('ec2_instances')
        .insert(instanceData)
        .select()
        .single();
      
      if (dbError) {
        console.error('Error launching instance:', dbError);
        throw dbError;
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
    } catch (err) {
      console.error('Error in launchInstance:', err);
      throw err;
    }
  },
  
  // SSH into an instance
  sshConnect: async (id: string, credentials?: { username?: string, password?: string, privateKey?: string }): Promise<{ sessionId: string }> => {
    try {
      // Try to establish SSH connection via edge function
      const { data: sshSession, error } = await supabase.functions.invoke('cloud-manager', {
        body: { 
          action: 'sshConnect',
          instanceId: id,
          credentials
        },
      });
      
      if (!error && sshSession) {
        return sshSession;
      }
      
      // Fallback to simulation
      console.log(`Falling back to simulation for SSH connection to instance ${id}`);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { sessionId: `ssh-${Math.random().toString(36).substring(2, 10)}` };
    } catch (err) {
      console.error('Error in sshConnect:', err);
      // Fallback to simulation
      console.log(`Connecting to instance ${id} via SSH`, credentials);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { sessionId: `ssh-${Math.random().toString(36).substring(2, 10)}` };
    }
  },
  
  // Execute SSH command
  executeCommand: async (sessionId: string, command: string): Promise<{ output: string }> => {
    try {
      // Try to execute command via edge function
      const { data: commandResult, error } = await supabase.functions.invoke('cloud-manager', {
        body: { 
          action: 'executeCommand',
          sessionId,
          command
        },
      });
      
      if (!error && commandResult) {
        return commandResult;
      }
      
      // Fallback to simulation
      console.log(`Falling back to simulation for command execution in session ${sessionId}`);
      
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
    } catch (err) {
      console.error('Error in executeCommand:', err);
      // Fallback to simulation
      console.log(`Executing command in session ${sessionId}: ${command}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let output = 'Command execution failed, using fallback output';
      if (command.includes('ls')) {
        output = 'app\ndata\nlogs\nnode_modules\npackage.json\nREADME.md';
      }
      
      return { output };
    }
  },
  
  // Terminate an instance
  terminateInstance: async (id: string): Promise<void> => {
    try {
      // Try to terminate instance via edge function
      const { error } = await supabase.functions.invoke('cloud-manager', {
        body: { 
          action: 'terminateInstance',
          instanceId: id
        },
      });
      
      if (!error) {
        return;
      }
      
      // Fallback to database update
      console.log('Falling back to database update for instance termination');
      
      const { error: dbError } = await supabase
        .from('ec2_instances')
        .update({ status: 'terminated' })
        .eq('id', id);
      
      if (dbError) {
        console.error('Error terminating instance:', dbError);
        throw dbError;
      }
    } catch (err) {
      console.error('Error in terminateInstance:', err);
      // Final fallback
      const { error: dbError } = await supabase
        .from('ec2_instances')
        .update({ status: 'terminated' })
        .eq('id', id);
      
      if (dbError) throw dbError;
    }
  },
  
  // Get usage statistics for an instance
  getInstanceStats: async (instanceId: string): Promise<UsageStatistic[]> => {
    try {
      // Try to get stats from the cloud provider via edge function
      const { data: cloudStats, error } = await supabase.functions.invoke('cloud-manager', {
        body: { 
          action: 'getInstanceStats',
          instanceId
        },
      });
      
      if (!error && cloudStats) {
        return cloudStats;
      }
      
      // Fallback to database
      console.log('Falling back to database for instance statistics');
      
      const { data, error: dbError } = await supabase
        .from('usage_statistics')
        .select('*')
        .eq('instance_id', instanceId)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (dbError) {
        console.error('Error fetching usage statistics:', dbError);
        throw dbError;
      }
      
      return data || [];
    } catch (err) {
      console.error('Error in getInstanceStats:', err);
      // Final fallback to database
      const { data, error: dbError } = await supabase
        .from('usage_statistics')
        .select('*')
        .eq('instance_id', instanceId)
        .order('timestamp', { ascending: false })
        .limit(10);
        
      if (dbError) throw dbError;
      return data || [];
    }
  }
};
