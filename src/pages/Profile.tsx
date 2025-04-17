
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCompany(profile.company || '');
      setBillingAddress(profile.billing_address || '');
    }
  }, [profile]);
  
  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          company,
          billing_address: billingAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
          <Button variant="destructive" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal and company information
            </CardDescription>
          </CardHeader>
          <form onSubmit={updateProfile}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                />
                <p className="text-sm text-muted-foreground">
                  Your email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="ACME Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Input
                  id="billingAddress"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="123 Main St, City, Country"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>
              View your subscription and payment history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-md">
              <h3 className="font-medium mb-2">Current Plan</h3>
              <p className="text-lg font-bold">Free Tier</p>
              <p className="text-sm text-muted-foreground">
                Limited to 5 EC2 instances
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Recent Transactions</h3>
              <div className="border rounded-md divide-y">
                {/* This would be populated from the transactions table */}
                <div className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">Initial Deposit</p>
                    <p className="text-sm text-muted-foreground">Apr 12, 2023</p>
                  </div>
                  <span className="font-semibold">NGN 15,000</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => navigate('/billing')}
            >
              Manage Billing
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
