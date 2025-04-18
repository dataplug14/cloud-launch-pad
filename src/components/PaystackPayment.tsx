
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PaystackPaymentProps {
  amount?: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

const PaystackPayment = ({ amount: initialAmount, onSuccess, onClose }: PaystackPaymentProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [customAmount, setCustomAmount] = useState(initialAmount?.toString() || '');
  const [loading, setLoading] = useState(false);

  const validateAmount = (value: string) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum amount is NGN 100",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(value);
  };

  const initializePayment = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email",
        variant: "destructive"
      });
      return;
    }

    if (!validateAmount(customAmount)) {
      return;
    }

    setLoading(true);

    try {
      const finalAmount = Number(customAmount);
      const reference = `pay_${Math.floor(Math.random() * 1000000000)}`;
      
      const { data, error } = await supabase.functions.invoke('payment-processor', {
        body: { 
          action: 'initializePayment',
          email,
          amount: finalAmount,
          reference,
          userId: user?.id
        },
      });
      
      if (error) throw new Error(error.message);
      
      if (data?.authorization_url) {
        window.open(data.authorization_url, '_blank');
        
        toast({
          title: "Payment Initialized",
          description: "Please complete your payment in the new window",
        });
        
        await supabase
          .from('transactions')
          .insert({
            user_id: user?.id,
            amount: finalAmount,
            reference: reference,
            status: 'pending'
          });
          
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
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
            <Label htmlFor="amount">Amount (NGN)</Label>
            <Input
              id="amount"
              type="text"
              placeholder="Enter amount (minimum NGN 100)"
              value={customAmount}
              onChange={handleAmountChange}
              min="100"
            />
            <p className="text-sm text-muted-foreground">
              Minimum amount: NGN 100
            </p>
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
