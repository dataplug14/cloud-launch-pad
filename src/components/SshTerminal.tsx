
import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { awsService } from '@/services/awsService';
import { toast } from "@/hooks/use-toast";

interface SshTerminalProps {
  instanceId: string;
  instanceName: string;
}

const SshTerminal = ({ instanceId, instanceName }: SshTerminalProps) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);
  
  // Connect to SSH
  const connect = async () => {
    try {
      setConnecting(true);
      
      // In a real app, you would have proper auth here
      const result = await awsService.sshConnect(instanceId, {
        username: 'admin',
        // For demo we're using a simple approach, real apps would use proper auth
        privateKey: localStorage.getItem(`ssh_key_${instanceId}`) || undefined
      });
      
      setSessionId(result.sessionId);
      setConnected(true);
      
      // Add welcome message
      setOutput([
        `Connected to ${instanceName} (${instanceId})`,
        'Welcome to AWS EC2 Linux',
        'Type commands below:',
        ''
      ]);
      
      // Focus the input field
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message || 'Could not establish SSH connection',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
    }
  };
  
  // Disconnect from SSH
  const disconnect = () => {
    setSessionId(null);
    setConnected(false);
    setOutput([]);
    toast({
      title: 'Disconnected',
      description: 'SSH session terminated'
    });
  };
  
  // Execute command
  const executeCommand = async () => {
    if (!sessionId || !command.trim()) return;
    
    // Add command to history
    setHistory(prev => [command, ...prev.slice(0, 19)]); // Keep last 20 commands
    setHistoryIndex(-1);
    
    // Add command to output
    setOutput(prev => [...prev, `$ ${command}`]);
    
    try {
      // Execute the command
      const result = await awsService.executeCommand(sessionId, command);
      
      // Add response to output
      setOutput(prev => [...prev, result.output, '']);
      
    } catch (error: any) {
      setOutput(prev => [...prev, `Error: ${error.message || 'Command execution failed'}`, '']);
    }
    
    // Clear command input
    setCommand('');
  };
  
  // Handle key presses for terminal-like behavior
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // In a real app, you would implement command completion here
    }
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>SSH Terminal - {instanceName}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {!connected ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <p className="text-muted-foreground">Not connected</p>
            <Button 
              onClick={connect} 
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect via SSH'}
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-black text-green-500 p-4 font-mono text-sm rounded-md">
            {output.map((line, index) => (
              <div key={index}>
                {line === '' ? <br /> : line}
              </div>
            ))}
            <div ref={outputEndRef} />
          </div>
        )}
      </CardContent>
      {connected && (
        <CardFooter className="border-t p-2">
          <div className="flex w-full items-center space-x-2">
            <Input
              ref={inputRef}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type command..."
              className="font-mono"
            />
            <Button variant="outline" onClick={executeCommand}>
              Run
            </Button>
            <Button variant="destructive" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default SshTerminal;
