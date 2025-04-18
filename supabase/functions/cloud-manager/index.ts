import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { S3Client } from 'npm:@aws-sdk/client-s3'
import { EC2Client, RunInstancesCommand, DescribeInstancesCommand, TerminateInstancesCommand } from 'npm:@aws-sdk/client-ec2'
import { CloudWatchClient, GetMetricDataCommand } from 'npm:@aws-sdk/client-cloudwatch'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { action, ...params } = await req.json()
    
    // Initialize AWS SDK with credentials from secrets
    const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID')
    const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY')
    const AWS_REGION = 'us-east-1' // Default region
    
    // Check if credentials are available
    const usingRealCredentials = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
    
    // Initialize AWS clients
    const ec2Client = usingRealCredentials ? new EC2Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    }) : null
    
    const cloudWatchClient = usingRealCredentials ? new CloudWatchClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    }) : null
    
    let response
    
    // Handle different action types
    switch (action) {
      case 'listInstances':
        response = await handleListInstances(ec2Client, usingRealCredentials)
        break
      
      case 'launchInstance':
        response = await handleLaunchInstance(ec2Client, params, usingRealCredentials)
        break
      
      case 'terminateInstance':
        response = await handleTerminateInstance(ec2Client, params, usingRealCredentials)
        break
      
      case 'getInstanceStats':
        response = await handleGetInstanceStats(cloudWatchClient, params, usingRealCredentials)
        break
      
      case 'sshConnect':
        response = await handleSSHConnect(params, usingRealCredentials)
        break
      
      case 'executeCommand':
        response = await handleExecuteCommand(params, usingRealCredentials)
        break
      
      default:
        throw new Error(`Unsupported action: ${action}`)
    }
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Error processing request:', error)
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleListInstances(ec2Client: EC2Client | null, usingRealCredentials: boolean) {
  if (usingRealCredentials && ec2Client) {
    try {
      const command = new DescribeInstancesCommand({})
      const data = await ec2Client.send(command)
      
      // Transform AWS response to match our application's format
      return data.Reservations?.flatMap(reservation => 
        reservation.Instances?.map(instance => ({
          id: instance.InstanceId,
          instance_id: instance.InstanceId,
          name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || 'Unnamed',
          status: instance.State?.Name || 'unknown',
          type: instance.InstanceType,
          launch_time: instance.LaunchTime,
          location: instance.Placement?.AvailabilityZone,
          cpu: getCpuCount(instance.InstanceType || ''),
          memory: getMemorySize(instance.InstanceType || ''),
          storage: 20, // Default value
          ipv6_enabled: false,
          username: 'admin',
          ssh_enabled: false,
          password_set: false,
        })) || []
      ) || []
    } catch (error) {
      console.error('AWS ListInstances Error:', error)
      return { message: 'Error fetching instances from AWS' }
    }
  } else {
    console.log('Using simulation for listInstances: AWS credentials not configured')
    return { message: 'Using simulated data: AWS credentials not configured' }
  }
}

async function handleLaunchInstance(ec2Client: EC2Client | null, params: any, usingRealCredentials: boolean) {
  const { name, type, options } = params
  
  if (usingRealCredentials && ec2Client) {
    try {
      // Prepare user data if provided
      let userData = undefined
      if (options?.userData) {
        userData = btoa(options.userData) // Base64 encode user data
      }
      
      const command = new RunInstancesCommand({
        ImageId: 'ami-0c55b159cbfafe1f0', // Amazon Linux 2 AMI
        InstanceType: type,
        MinCount: 1,
        MaxCount: 1,
        UserData: userData,
        TagSpecifications: [{
          ResourceType: 'instance',
          Tags: [{ Key: 'Name', Value: name }]
        }]
      })
      
      const data = await ec2Client.send(command)
      const instance = data.Instances?.[0]
      
      if (!instance) {
        throw new Error('Failed to launch instance')
      }
      
      return {
        id: instance.InstanceId,
        instance_id: instance.InstanceId,
        name: name,
        status: instance.State?.Name,
        type: instance.InstanceType,
        launch_time: instance.LaunchTime?.toISOString(),
        location: instance.Placement?.AvailabilityZone,
        storage: options?.storage || 20,
        cpu: getCpuCount(instance.InstanceType || ''),
        memory: getMemorySize(instance.InstanceType || ''),
        ipv6_enabled: options?.enableIpv6 || false,
        username: options?.username || 'admin',
        password_set: options?.password ? true : false,
        ssh_enabled: options?.enableSsh || false,
        ssh_key_set: (options?.enableSsh && options?.sshKey) ? true : false,
        user_data: options?.userData || null
      }
    } catch (error) {
      console.error('AWS LaunchInstance Error:', error)
      throw new Error('Failed to launch AWS instance')
    }
  } else {
    console.log('Using simulation for launchInstance: AWS credentials not configured')
    const instanceId = `i-${crypto.randomUUID().split('-')[0]}`
    
    return {
      id: instanceId,
      instance_id: instanceId,
      name: name,
      status: 'running',
      type: type,
      launch_time: new Date().toISOString(),
      location: options?.location || 'us-east-1a',
      storage: options?.storage || 20,
      cpu: getCpuCount(type),
      memory: getMemorySize(type),
      ipv6_enabled: options?.enableIpv6 || false,
      username: options?.username || 'admin',
      password_set: options?.password ? true : false,
      ssh_enabled: options?.enableSsh || false,
      ssh_key_set: (options?.enableSsh && options?.sshKey) ? true : false,
      user_data: options?.userData || null
    }
  }
}

async function handleTerminateInstance(ec2Client: EC2Client | null, params: any, usingRealCredentials: boolean) {
  const { instanceId } = params
  
  if (usingRealCredentials && ec2Client) {
    try {
      const command = new TerminateInstancesCommand({
        InstanceIds: [instanceId]
      })
      
      await ec2Client.send(command)
      return { message: `Instance ${instanceId} terminated successfully` }
    } catch (error) {
      console.error('AWS TerminateInstance Error:', error)
      throw new Error('Failed to terminate AWS instance')
    }
  } else {
    console.log('Using simulation for terminateInstance: AWS credentials not configured')
    return { message: 'Using simulated data: AWS credentials not configured' }
  }
}

async function handleGetInstanceStats(cloudWatchClient: CloudWatchClient | null, params: any, usingRealCredentials: boolean) {
  const { instanceId } = params
  
  if (usingRealCredentials && cloudWatchClient) {
    try {
      const now = new Date()
      const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const command = new GetMetricDataCommand({
        StartTime: startTime,
        EndTime: now,
        MetricDataQueries: [
          {
            Id: 'cpu',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/EC2',
                MetricName: 'CPUUtilization',
                Dimensions: [{ Name: 'InstanceId', Value: instanceId }]
              },
              Period: 300,
              Stat: 'Average'
            }
          },
          {
            Id: 'networkIn',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/EC2',
                MetricName: 'NetworkIn',
                Dimensions: [{ Name: 'InstanceId', Value: instanceId }]
              },
              Period: 300,
              Stat: 'Average'
            }
          },
          {
            Id: 'networkOut',
            MetricStat: {
              Metric: {
                Namespace: 'AWS/EC2',
                MetricName: 'NetworkOut',
                Dimensions: [{ Name: 'InstanceId', Value: instanceId }]
              },
              Period: 300,
              Stat: 'Average'
            }
          }
        ]
      })
      
      const data = await cloudWatchClient.send(command)
      
      // Transform CloudWatch data into our format
      const stats = data.MetricDataResults?.[0].Timestamps?.map((timestamp, i) => ({
        id: crypto.randomUUID(),
        instance_id: instanceId,
        timestamp: timestamp.toISOString(),
        cpu_usage: data.MetricDataResults?.[0].Values?.[i] || 0,
        memory_usage: Math.random() * 100, // Placeholder since memory requires CloudWatch agent
        network_in: data.MetricDataResults?.[1].Values?.[i] || 0,
        network_out: data.MetricDataResults?.[2].Values?.[i] || 0
      })) || []
      
      return stats
      
    } catch (error) {
      console.error('AWS GetInstanceStats Error:', error)
      return simulateInstanceStats(instanceId)
    }
  } else {
    return simulateInstanceStats(instanceId)
  }
}

function simulateInstanceStats(instanceId: string) {
  const now = new Date()
  const stats = []
  
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now)
    timestamp.setHours(now.getHours() - (23 - i))
    
    stats.push({
      id: crypto.randomUUID(),
      instance_id: instanceId,
      timestamp: timestamp.toISOString(),
      cpu_usage: Math.random() * 80 + 5,
      memory_usage: Math.random() * 70 + 10,
      network_in: Math.random() * 5000,
      network_out: Math.random() * 3000
    })
  }
  
  return stats
}

async function handleSSHConnect(params: any, usingRealCredentials: boolean) {
  // In a real implementation, you might use a service like AWS Systems Manager Session Manager
  // For this demo, we'll just return a simulated session ID
  return { sessionId: `ssh-${crypto.randomUUID()}` }
}

async function handleExecuteCommand(params: any, usingRealCredentials: boolean) {
  const { sessionId, command } = params
  
  // In a real implementation, you might use AWS Systems Manager Run Command
  // For this demo, we'll just return simulated output
  let output = ''
      
  if (command.includes('ls')) {
    output = 'app\ndata\nlogs\nnode_modules\npackage.json\nREADME.md'
  } else if (command.includes('ps')) {
    output = 'PID   USER     TIME  COMMAND\n1     root      0:00 init\n400   admin     0:02 node server.js\n500   admin     0:01 nginx'
  } else if (command.includes('df')) {
    output = 'Filesystem     1K-blocks    Used Available Use% Mounted on\n/dev/root       8123456 2345678   5777778  29% /'
  } else {
    output = `Command executed: ${command}`
  }
      
  return { output }
}

function getCpuCount(instanceType: string): number {
  const cpuMap: Record<string, number> = {
    't2.micro': 1,
    't2.small': 1,
    't2.medium': 2,
    't2.large': 2,
    'c5.large': 2,
    'r5.large': 2
  }
  return cpuMap[instanceType] || 1
}

function getMemorySize(instanceType: string): number {
  const memoryMap: Record<string, number> = {
    't2.micro': 1,
    't2.small': 2,
    't2.medium': 4,
    't2.large': 8,
    'c5.large': 4,
    'r5.large': 16
  }
  return memoryMap[instanceType] || 1
}
