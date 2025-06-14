
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Phone, Mail, Save, Users, AlertTriangle, Code, Headphones } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  relationship: string;
  enabled: boolean;
}

export const EmergencyContacts: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = () => {
    const savedContacts = localStorage.getItem('jericho-emergency-contacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  };

  const saveContacts = (updatedContacts: EmergencyContact[]) => {
    setContacts(updatedContacts);
    localStorage.setItem('jericho-emergency-contacts', JSON.stringify(updatedContacts));
  };

  const createNewContact = () => {
    const newContact: EmergencyContact = {
      id: `contact_${Date.now()}`,
      name: '',
      phone: '',
      email: '',
      priority: 'medium',
      relationship: '',
      enabled: true
    };
    setEditingContact(newContact);
  };

  const saveContact = () => {
    if (!editingContact || !editingContact.name || !editingContact.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in name and phone number",
        variant: "destructive",
      });
      return;
    }

    const existingIndex = contacts.findIndex(c => c.id === editingContact.id);
    let updatedContacts;
    
    if (existingIndex >= 0) {
      updatedContacts = contacts.map(c => c.id === editingContact.id ? editingContact : c);
    } else {
      updatedContacts = [...contacts, editingContact];
    }
    
    saveContacts(updatedContacts);
    setEditingContact(null);
    
    toast({
      title: "Contact Saved",
      description: `${editingContact.name} added to emergency contacts`,
    });
  };

  const deleteContact = (contactId: string) => {
    const updatedContacts = contacts.filter(c => c.id !== contactId);
    saveContacts(updatedContacts);
    
    toast({
      title: "Contact Removed",
      description: "Emergency contact deleted successfully",
    });
  };

  const toggleContactEnabled = (contactId: string, enabled: boolean) => {
    const updatedContacts = contacts.map(c => 
      c.id === contactId ? { ...c, enabled } : c
    );
    saveContacts(updatedContacts);
  };

  const dialContact = (phone: string) => {
    if (navigator.userAgent.match(/Mobi/)) {
      window.location.href = `tel:${phone}`;
    } else {
      toast({
        title: "Dialing Feature",
        description: `On mobile: ${phone} would be dialed automatically`,
      });
    }
  };

  const emailContact = (email: string, subject: string = 'Security Alert - Jericho System') => {
    window.location.href = `mailto:${email}?subject=${subject}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Developer Support Section */}
      <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-200 flex items-center">
          <Code className="w-5 h-5 mr-2" />
          Developer Support
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          Need technical support or have questions about the system? Contact our developer team.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dialContact('0629145963')}
            className="text-blue-600 border-blue-300 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900/20"
          >
            <Phone className="w-3 h-3 mr-1" />
            Call: 062 914 5963
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => emailContact('info@sandz.co.za', 'Jericho Security System Support')}
            className="text-blue-600 border-blue-300 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900/20"
          >
            <Mail className="w-3 h-3 mr-1" />
            Email: info@sandz.co.za
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide">Emergency Contacts</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Set up contacts for emergency situations and motion alerts
          </p>
        </div>
        <Button onClick={createNewContact} className="jericho-btn-accent">
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact List */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide">Emergency Contacts List</h4>
          
          {contacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border-2 border-dashed border-border rounded-lg">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-semibold">No Emergency Contacts</p>
              <p className="text-sm mt-1">Add contacts for emergency situations</p>
            </div>
          ) : (
            contacts
              .sort((a, b) => {
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
              })
              .map((contact) => (
                <div key={contact.id} className="p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{contact.name}</span>
                      <Badge className={getPriorityColor(contact.priority)}>
                        {contact.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingContact(contact)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteContact(contact.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-3">
                    <div>Phone: {contact.phone}</div>
                    {contact.email && <div>Email: {contact.email}</div>}
                    <div>Relationship: {contact.relationship}</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={contact.enabled ? "default" : "secondary"}>
                      {contact.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dialContact(contact.phone)}
                        disabled={!contact.enabled}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </Button>
                      {contact.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => emailContact(contact.email!)}
                          disabled={!contact.enabled}
                        >
                          <Mail className="w-3 h-3 mr-1" />
                          Email
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Edit Panel */}
        <div className="space-y-4">
          <h4 className="font-semibold uppercase tracking-wide">
            {editingContact ? 'Contact Configuration' : 'Select Contact to Edit'}
          </h4>
          
          {editingContact ? (
            <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="contactName">Full Name</Label>
                  <Input
                    id="contactName"
                    value={editingContact.name}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      name: e.target.value
                    })}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <Input
                    id="contactPhone"
                    value={editingContact.phone}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      phone: e.target.value
                    })}
                    placeholder="+1234567890"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactEmail">Email (Optional)</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={editingContact.email}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      email: e.target.value
                    })}
                    placeholder="john@example.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    value={editingContact.relationship}
                    onChange={(e) => setEditingContact({
                      ...editingContact,
                      relationship: e.target.value
                    })}
                    placeholder="Family, Friend, Security"
                  />
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select
                    value={editingContact.priority}
                    onValueChange={(value: 'critical' | 'high' | 'medium' | 'low') => 
                      setEditingContact({
                        ...editingContact,
                        priority: value
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={saveContact}
                  disabled={!editingContact.name || !editingContact.phone}
                  className="flex-1 jericho-btn-primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Contact
                </Button>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => setEditingContact(null)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">No Contact Selected</p>
                <p className="text-sm mt-1">Select a contact to edit or add a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Emergency Actions */}
      {contacts.filter(c => c.enabled && c.priority === 'critical').length > 0 && (
        <div className="mt-6 p-4 border-2 border-red-200 rounded-lg bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <h5 className="font-semibold mb-3 text-red-800 dark:text-red-200 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Quick Emergency Actions
          </h5>
          <div className="flex flex-wrap gap-2">
            {contacts
              .filter(c => c.enabled && c.priority === 'critical')
              .map(contact => (
                <Button
                  key={contact.id}
                  variant="destructive"
                  size="sm"
                  onClick={() => dialContact(contact.phone)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Call {contact.name}
                </Button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};
