import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { awsService } from '@/services/awsService';

const instanceFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters." }),
  type: z.string(),
  storage: z.number().min(10).max(1000),
  cpu: z.number().min(1).max(32),
  memory: z.number().min(1).max(128),
  location: z.string(),
  enableIpv6: z.boolean().default(false),
  username: z.string().min(2, { message: "Username must be at least 2 characters." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  enableSsh: z.boolean().default(false),
  sshKey: z.string().optional(),
  userData: z.string().optional(),
  additionalVolumes: z.array(
    z.object({
      name: z.string(),
      size: z.number(),
      type: z.string()
    })
  ).optional()
});

type InstanceFormValues = z.infer<typeof instanceFormSchema>;

interface LaunchInstanceFormProps {
  onSuccess: () => void;
}

export default function LaunchInstanceForm({ onSuccess }: LaunchInstanceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<InstanceFormValues>({
    resolver: zodResolver(instanceFormSchema),
    defaultValues: {
      name: "",
      type: "t2.micro",
      storage: 20,
      cpu: 1,
      memory: 1,
      location: "us-east-1",
      enableIpv6: false,
      username: "admin",
      password: "",
      enableSsh: false,
      sshKey: "",
      userData: "",
      additionalVolumes: []
    },
  });

  async function onSubmit(values: InstanceFormValues) {
    try {
      setIsSubmitting(true);
      
      await awsService.launchInstance(
        values.name, 
        values.type,
        {
          storage: values.storage,
          cpu: values.cpu,
          memory: values.memory,
          location: values.location,
          enableIpv6: values.enableIpv6,
          username: values.username,
          password: values.password,
          enableSsh: values.enableSsh,
          sshKey: values.sshKey,
          userData: values.userData
        }
      );
      
      toast({
        title: "Instance Launched",
        description: `New instance ${values.name} is now being provisioned`,
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to launch instance",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="text-sm">Basic</TabsTrigger>
            <TabsTrigger value="network" className="text-sm">Network</TabsTrigger>
            <TabsTrigger value="access" className="text-sm">Access</TabsTrigger>
            <TabsTrigger value="advanced" className="text-sm">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instance Name</FormLabel>
                  <FormControl>
                    <Input placeholder="my-instance" {...field} />
                  </FormControl>
                  <FormDescription>
                    A unique name for your virtual machine.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instance Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an instance type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="t2.micro">t2.micro (1 vCPU, 1 GiB RAM)</SelectItem>
                      <SelectItem value="t2.small">t2.small (1 vCPU, 2 GiB RAM)</SelectItem>
                      <SelectItem value="t2.medium">t2.medium (2 vCPU, 4 GiB RAM)</SelectItem>
                      <SelectItem value="t2.large">t2.large (2 vCPU, 8 GiB RAM)</SelectItem>
                      <SelectItem value="c5.large">c5.large (2 vCPU, 4 GiB RAM, Compute optimized)</SelectItem>
                      <SelectItem value="r5.large">r5.large (2 vCPU, 16 GiB RAM, Memory optimized)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The hardware configuration of your instance.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="storage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage (GB): {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                        min={10}
                        max={1000}
                        step={10}
                        defaultValue={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                        className="pt-5"
                      />
                    </FormControl>
                    <FormDescription>
                      The storage size for your root volume.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                        <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                        <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The region where your instance will be deployed.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="network" className="space-y-4">
            <FormField
              control={form.control}
              name="enableIpv6"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-4">
                  <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable IPv6</FormLabel>
                      <FormDescription>
                        Assign an IPv6 address to this instance
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                  {field.value && (
                    <Alert variant="default" className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-blue-700">
                        IPv6 will be enabled for this instance at an additional cost of $5 per month.
                      </AlertDescription>
                    </Alert>
                  )}
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="access" className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    The username for accessing the instance.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    The password for accessing the instance.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="enableSsh"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable SSH Access</FormLabel>
                    <FormDescription>
                      Allow SSH access to this instance.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            {form.watch("enableSsh") && (
              <FormField
                control={form.control}
                name="sshKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSH Public Key</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="ssh-rsa AAAAB3NzaC1yc2E..."
                        className="font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your SSH public key for secure access.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <FormField
              control={form.control}
              name="userData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Data (Cloud-init)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="#!/bin/bash\napt-get update\napt-get install -y nginx"
                      className="font-mono text-sm h-40"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Startup script that runs when the instance launches.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Launching..." : "Launch Instance"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
