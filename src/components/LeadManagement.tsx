import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Edit, Trash2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  phoneNumber: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
  status: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
})

type Lead = z.infer<typeof formSchema> & { id: string };

const LeadManagement: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState<Lead>({
    id: '',
    name: '',
    phoneNumber: '',
    email: '',
    status: '',
    source: '',
    notes: '',
  });

  useEffect(() => {
    // Load leads from local storage on component mount
    const storedLeads = localStorage.getItem('leads');
    if (storedLeads) {
      setLeads(JSON.parse(storedLeads));
    }
  }, []);

  useEffect(() => {
    // Save leads to local storage whenever the leads state changes
    localStorage.setItem('leads', JSON.stringify(leads));
  }, [leads]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      email: "",
      status: "",
      source: "",
      notes: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newLead: Lead = { ...values, id: Date.now().toString() };
    setLeads([...leads, newLead]);
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    })
    form.reset();
    setOpen(false);
  }

  const handleEdit = (lead: Lead) => {
    setCurrentLead(lead);
    setEditOpen(true);
  };

  const handleDelete = (id: string) => {
    setLeads(leads.filter(lead => lead.id !== id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentLead({ ...currentLead, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (e: any) => {
    setCurrentLead({ ...currentLead, [e.target.name]: e.target.value });
  };

  const handleUpdate = () => {
    setLeads(leads.map(lead => lead.id === currentLead.id ? currentLead : lead));
    setEditOpen(false);
  };

  return (
    
      
        
          Lead Management
        
        
          Add Lead
        
      

      
        
          
            Name
          
          
            Phone Number
          
          
            Email
          
          
            Status
          
          
            Source
          
          
            Notes
          
          
        

        
          {leads.map((lead) => (
            
              
                {lead.name}
              
              
                {lead.phoneNumber}
              
              
                {lead.email}
              
              
                {lead.status || 'N/A'}
              
              
                {lead.source || 'N/A'}
              
              
                {lead.notes || 'N/A'}
              
              
                
                  <Edit className="h-4 w-4 mr-2" />
                
                
                  <Trash2 className="h-4 w-4" />
                
              
            
          ))}
        
      

      
        
          
            Edit Lead
            Update lead details.
          
          
            
              
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={currentLead.name} onChange={handleInputChange} />
              
              
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" name="phoneNumber" value={currentLead.phoneNumber} onChange={handleInputChange} />
              
              
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" value={currentLead.email} onChange={handleInputChange} />
              
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={currentLead.status} onValueChange={(value) => handleSelectChange({ target: { name: 'status', value } } as any)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
                <Label htmlFor="source">Source</Label>
                <Input id="source" name="source" value={currentLead.source} onChange={handleInputChange} />
              
              
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" value={currentLead.notes} onChange={handleInputChange} />
              
            
          
          
            
              Cancel
            
            Update
          
        
      

      
        
          
            Add Lead
            Add a new lead to the system.
          
          
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                  
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...form.register("name")} />
                      </FormControl>
                      <FormDescription>
                        This is the lead's name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  
                  
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="123-456-7890" {...form.register("phoneNumber")} />
                      </FormControl>
                      <FormDescription>
                        This is the lead's phone number.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  
                  
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe@example.com" {...form.register("email")} />
                      </FormControl>
                      <FormDescription>
                        This is the lead's email address.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  
                  
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                      <FormControl>
                        <Select {...form.register("status")}>
                          
                            
                              Select a status
                            
                            
                              New
                            
                            
                              In Progress
                            
                            
                              Qualified
                            
                            
                              Closed
                            
                          
                        </Select>
                      </FormControl>
                      <FormDescription>
                        This is the lead's current status.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  
                  
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Input placeholder="Web, Referral, etc." {...form.register("source")} />
                      </FormControl>
                      <FormDescription>
                        This is the lead's source.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  
                  
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Any notes about the lead" {...form.register("notes")} />
                      </FormControl>
                      <FormDescription>
                        Any notes about the lead.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  
                
                
                  Create Lead
                
              </form>
            </Form>
          
        
      
    
  );
};

export default LeadManagement;
