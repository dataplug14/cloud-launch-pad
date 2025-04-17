
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type EC2Instance = Database['public']['Tables']['ec2_instances']['Row'];
type UsageStatistic = Database['public']['Tables']['usage_statistics']['Row'];

// This is a simulated AWS service that would actually call AWS APIs
// In a real implementation, you would use AWS SDK or call your backend APIs
export const awsService = {
  // Get all instances for current user
  getInstances: async (): Promise<EC2Instance[]> => {
    const { data, error } = await supabase
      .from('ec2_instances')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching EC2 instances:', error);
      throw error;
    }
    
    return data || [];
  },
  
  // Launch a new EC2 instance
  launchInstance: async (
    name: string, 
    type: string
  ): Promise<EC2Instance> => {
    // In a real app, this would call AWS API to create an instance
    const instanceId = `i-${Math.random().toString(36).substring(2, 10)}`;
    const launchTime = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('ec2_instances')
      .insert({
        instance_id: instanceId,
        name,
        status: 'running',
        type,
        launch_time: launchTime,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error launching EC2 instance:', error);
      throw error;
    }
    
    // Also insert some initial usage statistics
    await supabase
      .from('usage_statistics')
      .insert({
        instance_id: data.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        cpu_usage: Math.random() * 20,
        memory_usage: Math.random() * 30,
        network_in: Math.random() * 100,
        network_out: Math.random() * 50
      });
    
    return data;
  },
  
  // Terminate an instance
  terminateInstance: async (id: string): Promise<void> => {
    // In a real app, this would call AWS API to terminate an instance
    const { error } = await supabase
      .from('ec2_instances')
      .update({ status: 'terminated' })
      .eq('id', id);
    
    if (error) {
      console.error('Error terminating EC2 instance:', error);
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
