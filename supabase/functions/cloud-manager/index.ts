
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
      }))
    )
  } else {
    // For demonstration, return a message indicating simulation
    console.log('Using simulation for listInstances: AWS credentials not configured')
    return { message: 'Using simulated data: AWS credentials not configured' }
  }
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
      ipv6_enabled: options?.enableIpv6 || false,
      username: options?.username || 'admin',
      ssh_enabled: options?.enableSsh || false,
    }
  } else {
    // For demonstration, return a message indicating simulation
    console.log('Using simulation for launchInstance: AWS credentials not configured')
    return { message: 'Using simulated data: AWS credentials not configured' }
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
    // For demonstration, return a message indicating simulation
    console.log('Using simulation for getInstanceStats: AWS credentials not configured')
    return { message: 'Using simulated data: AWS credentials not configured' }
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
