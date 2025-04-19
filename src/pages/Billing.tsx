
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SideNavigation } from '@/components/Sidebar';
import PaystackPayment from '@/components/PaystackPayment';
import { useAuth } from '@/contexts/AuthContext';

const Billing = () => {
  const { user } = useAuth();
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SideNavigation />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Usage</h1>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Current Balance</CardTitle>
                <CardDescription>Available credits</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">₦0.00</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Monthly Usage</CardTitle>
                <CardDescription>Current billing period</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">₦0.00</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Active Resources</CardTitle>
                <CardDescription>Running instances</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">0</p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods and add funds</CardDescription>
            </CardHeader>
            <CardContent>
              {showPayment ? (
                <PaystackPayment 
                  onSuccess={() => setShowPayment(false)}
                  onClose={() => setShowPayment(false)}
                />
              ) : (
                <Button onClick={() => setShowPayment(true)}>
                  Add Funds
                </Button>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>Your recent transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                No transactions found
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Billing;
