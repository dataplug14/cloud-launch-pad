
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { AWS } from 'npm:aws-sdk'

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
    
    // Check if credentials are available
    const usingRealCredentials = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
    
    if (usingRealCredentials) {
      // Set up AWS config with real credentials
      AWS.config.update({
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        region: 'us-east-1', // Default region
      })
    }
    
    let response
    
    // Handle different action types
    switch (action) {
      case 'listInstances':
        response = await handleListInstances(usingRealCredentials)
        break
      
      case 'launchInstance':
        response = await handleLaunchInstance(params, usingRealCredentials)
        break
      
      case 'terminateInstance':
        response = await handleTerminateInstance(params, usingRealCredentials)
        break
      
      case 'getInstanceStats':
        response = await handleGetInstanceStats(params, usingRealCredentials)
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

async function handleListInstances(usingRealCredentials: boolean) {
  if (usingRealCredentials) {
    // Use AWS SDK to list actual EC2 instances
    const ec2 = new AWS.EC2()
    const data = await ec2.describeInstances().promise()
    
    // Transform AWS response to match our application's format
    return data.Reservations.flatMap(reservation => 
      reservation.Instances.map(instance => ({
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
        ipv6_enabled: false, // Default value
        username: 'admin', // Default value
        ssh_enabled: false, // Default value
        password_set: false, // Default value
      }))
    )
  } else {
    // For demonstration, return a message indicating simulation
    console.log('Using simulation for listInstances: AWS credentials not configured')
    return { message: 'Using simulated data: AWS credentials not configured' }
  }
}

// Helper functions to get CPU and memory from instance type
function getCpuCount(instanceType: string): number {
  // Simple mapping of instance types to vCPU count
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
  // Simple mapping of instance types to memory size in GB
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

async function handleLaunchInstance(params: any, usingRealCredentials: boolean) {
  const { name, type, options } = params
  
  if (usingRealCredentials) {
    // Use AWS SDK to launch an actual EC2 instance
    const ec2 = new AWS.EC2()
    
    // Prepare user data if provided
    let userData = undefined
    if (options?.userData) {
      userData = Buffer.from(options.userData).toString('base64')
    }
    
    // Create tags including name
    const tags = [
      {
        Key: 'Name',
        Value: name
      }
    ]
    
    // Launch the instance
    const result = await ec2.runInstances({
      ImageId: 'ami-0c55b159cbfafe1f0', // Amazon Linux 2 AMI (adjust as needed)
      InstanceType: type,
      MinCount: 1,
      MaxCount: 1,
      UserData: userData,
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: tags
        }
      ]
    }).promise()
    
    const instance = result.Instances[0]
    
    // Return the instance data in our application's format
    return {
      id: instance.InstanceId,
      instance_id: instance.InstanceId,
      name: name,
      status: instance.State?.Name,
      type: instance.InstanceType,
      launch_time: instance.LaunchTime.toISOString(),
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
  } else {
    // For demonstration, create a simulated instance
    console.log('Using simulation for launchInstance: AWS credentials not configured')
    
    const instanceId = `i-${Math.random().toString(36).substring(2, 10)}`
    const launchTime = new Date().toISOString()
    
    // Return complete simulated instance data
    return {
      id: instanceId,
      instance_id: instanceId,
      name: name,
      status: 'running',
      type: type,
      launch_time: launchTime,
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

async function handleTerminateInstance(params: any, usingRealCredentials: boolean) {
  const { instanceId } = params
  
  if (usingRealCredentials) {
    // Use AWS SDK to terminate the actual EC2 instance
    const ec2 = new AWS.EC2()
    
    await ec2.terminateInstances({
      InstanceIds: [instanceId]
    }).promise()
    
    return { message: `Instance ${instanceId} terminated successfully` }
  } else {
    // For demonstration, return a message indicating simulation
    console.log('Using simulation for terminateInstance: AWS credentials not configured')
    return { message: 'Using simulated data: AWS credentials not configured' }
  }
}

async function handleGetInstanceStats(params: any, usingRealCredentials: boolean) {
  const { instanceId } = params
  
  if (usingRealCredentials) {
    // Use AWS CloudWatch to get actual instance metrics
    const cloudwatch = new AWS.CloudWatch()
    
    // Get CPU utilization
    const cpuData = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'cpu',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instanceId
                }
              ]
            },
            Period: 300,
            Stat: 'Average'
          }
        }
      ],
      StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      EndTime: new Date()
    }).promise()
    
    // Get memory utilization (note: requires CloudWatch agent)
    // Get network in/out
    const networkInData = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'networkIn',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkIn',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instanceId
                }
              ]
            },
            Period: 300,
            Stat: 'Average'
          }
        }
      ],
      StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      EndTime: new Date()
    }).promise()
    
    const networkOutData = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'networkOut',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkOut',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instanceId
                }
              ]
            },
            Period: 300,
            Stat: 'Average'
          }
        }
      ],
      StartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      EndTime: new Date()
    }).promise()
    
    // Combine results into our application's format
    return cpuData.MetricDataResults[0].Timestamps.map((timestamp, i) => ({
      id: crypto.randomUUID(),
      instance_id: instanceId,
      timestamp: timestamp.toISOString(),
      cpu_usage: cpuData.MetricDataResults[0].Values[i],
      network_in: networkInData.MetricDataResults[0].Values[i],
      network_out: networkOutData.MetricDataResults[0].Values[i],
      memory_usage: Math.random() * 100, // Placeholder, would need CloudWatch agent for real data
    }))
  } else {
    // For demonstration, create simulated stats
    console.log('Using simulation for getInstanceStats: AWS credentials not configured')
    
    const now = new Date();
    const stats = [];
    
    // Generate 24 hours of data at hourly intervals
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now);
      timestamp.setHours(now.getHours() - (23 - i));
      
      stats.push({
        id: crypto.randomUUID(),
        instance_id: instanceId,
        timestamp: timestamp.toISOString(),
        cpu_usage: Math.random() * 80 + 5, // 5-85%
        memory_usage: Math.random() * 70 + 10, // 10-80%
        network_in: Math.random() * 5000, // KB
        network_out: Math.random() * 3000, // KB
      });
    }
    
    return stats;
  }
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
