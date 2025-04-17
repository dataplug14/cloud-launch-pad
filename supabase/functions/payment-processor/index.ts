
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

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
    
    // Get the Paystack secret key from environment variables
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
    
    // Check if the key is available
    const usingRealCredentials = !!PAYSTACK_SECRET_KEY
    
    let response
    
    // Handle different action types
    switch (action) {
      case 'initializePayment':
        response = await handleInitializePayment(params, PAYSTACK_SECRET_KEY, usingRealCredentials)
        break
      
      case 'verifyPayment':
        response = await handleVerifyPayment(params, PAYSTACK_SECRET_KEY, usingRealCredentials)
        break
      
      default:
        throw new Error(`Unsupported action: ${action}`)
    }
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
    
  } catch (error) {
    console.error('Error processing payment request:', error)
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleInitializePayment(params: any, secretKey: string | undefined, usingRealCredentials: boolean) {
  const { email, amount, reference, userId } = params
  
  if (usingRealCredentials && secretKey) {
    // Make a real API call to Paystack to initialize payment
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack expects amount in kobo (100 kobo = 1 Naira)
        reference,
        callback_url: 'https://example.com/payment-callback', // Replace with your callback URL
        metadata: {
          user_id: userId,
        }
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to initialize payment with Paystack')
    }
    
    return data.data
  } else {
    // For demonstration, return a simulated response
    console.log('Using simulation for payment: Paystack credentials not configured')
    
    return {
      authorization_url: `https://checkout.paystack.com/?amount=${amount * 100}&email=${email}&reference=${reference}`,
      access_code: 'simulated_access_code',
      reference
    }
  }
}

async function handleVerifyPayment(params: any, secretKey: string | undefined, usingRealCredentials: boolean) {
  const { reference } = params
  
  if (usingRealCredentials && secretKey) {
    // Make a real API call to Paystack to verify payment
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify payment with Paystack')
    }
    
    return data.data
  } else {
    // For demonstration, return a simulated response
    console.log('Using simulation for payment verification: Paystack credentials not configured')
    
    return {
      status: 'success',
      reference,
      amount: params.amount * 100,
      paidAt: new Date().toISOString()
    }
  }
}
