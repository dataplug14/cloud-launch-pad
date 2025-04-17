
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Type definition for EC2 instances without modifying the types.ts file
type EC2Instance = {
  id: string;
  name: string;
  status: "running" | "stopped" | "terminated";
  type: string;
  launchTime: string;
};

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<EC2Instance[]>([]);

  // Example instances for display purposes
  useEffect(() => {
    // In a real app, we would fetch instances from Supabase
    setInstances([
      {
        id: "i-12345678",
        name: "Web Server",
        status: "running",
        type: "t2.micro",
        launchTime: new Date().toISOString()
      },
      {
        id: "i-87654321",
        name: "Database",
        status: "stopped",
        type: "t2.small",
        launchTime: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Magic link sent",
        description: "Check your email for the login link",
      });
      
      // For demo purposes only - in a real app we would verify the magic link
      setTimeout(() => {
        setIsLoggedIn(true);
        setLoading(false);
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const launchInstance = () => {
    const newInstance: EC2Instance = {
      id: `i-${Math.random().toString(36).substr(2, 8)}`,
      name: "New Instance",
      status: "running",
      type: "t2.micro",
      launchTime: new Date().toISOString()
    };
    
    setInstances([...instances, newInstance]);
    
    toast({
      title: "Instance Launched",
      description: `New EC2 instance ${newInstance.id} is now running`,
    });
  };

  const terminateInstance = (instanceId: string) => {
    setInstances(instances.map(instance => 
      instance.id === instanceId 
        ? { ...instance, status: "terminated" } 
        : instance
    ));
    
    toast({
      title: "Instance Terminated",
      description: `EC2 instance ${instanceId} has been terminated`,
    });
  };

  // Login screen when not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-6">AWS EC2 Manager</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending Magic Link..." : "Login with Magic Link"}
            </Button>
          </form>
          
          <div className="mt-6">
            <Alert>
              <AlertTitle>Demo Mode</AlertTitle>
              <AlertDescription>
                This is a demo application. Enter any email and the login will be simulated.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard when logged in
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">AWS EC2 Manager</h1>
          <Button 
            variant="outline" 
            onClick={() => setIsLoggedIn(false)}
          >
            Logout
          </Button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your EC2 Instances</h2>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>Launch New Instance</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Launch EC2 Instance</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will launch a new t2.micro instance with Ubuntu. 
                    In a real application, you would configure instance details here.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={launchInstance}>
                    Launch Instance
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instance ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Launch Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell>{instance.id}</TableCell>
                    <TableCell>{instance.name}</TableCell>
                    <TableCell>{instance.type}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        instance.status === 'running' ? 'bg-green-100 text-green-800' :
                        instance.status === 'stopped' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {instance.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(instance.launchTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {instance.status !== 'terminated' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Terminate
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Terminate Instance</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to terminate this instance? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => terminateInstance(instance.id)}
                              >
                                Terminate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                
                {instances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No instances found. Launch your first instance to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
