
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const PAYSTACK_PUBLIC_KEY = "pk_test_yourkeyhere"; // Replace with actual key in production

interface PaystackPaymentProps {
  amount: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

const PaystackPayment = ({ amount, onSuccess, onClose }: PaystackPaymentProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const initializePayment = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Generate a unique reference
    const reference = `pay_${Math.floor(Math.random() * 1000000000)}`;
    
    try {
      // Save transaction to database first
      const { error: dbError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          amount: amount,
          reference: reference,
          status: 'pending'
        });

      if (dbError) throw dbError;

      // Initialize Paystack checkout
      // In a real implementation, you would use the Paystack SDK
      // This is a simplified version that demonstrates the flow
      window.open(
        `https://checkout.paystack.com/?amount=${amount * 100}&email=${email}&reference=${reference}`,
        '_blank'
      );

      toast({
        title: "Payment Initialized",
        description: "Please complete your payment in the new window",
      });

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
      
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Could not initialize payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Funds to Your Account</CardTitle>
        <CardDescription>
          Securely add funds to your account with Paystack
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email for Payment Receipt</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="rounded-md border p-4 text-center font-semibold">
              NGN {amount.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={initializePayment} disabled={loading}>
          {loading ? "Processing..." : "Pay Now"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PaystackPayment;
