
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, MapPin, Save, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DialPlan {
  pattern: string;
  description: string;
  example: string;
  enabled: boolean;
}

export const DialingPlan: React.FC = () => {
  const [dialPlans] = useState<DialPlan[]>([
    {
      pattern: "1XXX",
      description: "Internal Extensions",
      example: "1001, 1002, 1003",
      enabled: true
    },
    {
      pattern: "0XXXXXXXXX",
      description: "South African Landlines",
      example: "011 123 4567 → 0111234567",
      enabled: true
    },
    {
      pattern: "0XXXXXXXXX",
      description: "South African Mobile",
      example: "082 123 4567 → 0821234567",
      enabled: true
    },
    {
      pattern: "10177",
      description: "Police Emergency",
      example: "10177",
      enabled: true
    },
    {
      pattern: "10111",
      description: "Police Emergency",
      example: "10111",
      enabled: true
    },
    {
      pattern: "107",
      description: "Medical Emergency",
      example: "107",
      enabled: true
    },
    {
      pattern: "112",
      description: "International Emergency",
      example: "112",
      enabled: true
    },
    {
      pattern: "00XXXXXXXXXXX",
      description: "International Calls",
      example: "00 44 20 1234 5678",
      enabled: false
    }
  ]);

  const [testNumber, setTestNumber] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const { toast } = useToast();

  const testDialPlan = () => {
    if (!testNumber) {
      toast({
        title: "Enter Number",
        description: "Please enter a number to test",
        variant: "destructive",
      });
      return;
    }

    let matched = false;
    let matchedPlan = '';

    for (const plan of dialPlans) {
      if (!plan.enabled) continue;
      
      const pattern = plan.pattern.replace(/X/g, '[0-9]');
      const regex = new RegExp(`^${pattern}$`);
      
      if (regex.test(testNumber)) {
        matched = true;
        matchedPlan = plan.description;
        break;
      }
    }

    if (matched) {
      setTestResult(`✅ Number matches: ${matchedPlan}`);
      toast({
        title: "Valid Number",
        description: `${testNumber} matches ${matchedPlan}`,
      });
    } else {
      setTestResult(`❌ No matching dial plan found`);
      toast({
        title: "Invalid Number",
        description: `${testNumber} doesn't match any enabled dial plan`,
        variant: "destructive",
      });
    }
  };

  const copyAsteriskConfig = () => {
    const config = `; Jericho Security System Dial Plan
; South African dialing patterns

[from-internal]
; Internal extensions
exten => _1XXX,1,Dial(SIP/\${EXTEN},30)
exten => _1XXX,n,Hangup()

; South African landlines (011, 021, 031, etc.)
exten => _0XXXXXXXXX,1,Dial(SIP/\${EXTEN}@voip-provider)
exten => _0XXXXXXXXX,n,Hangup()

; Emergency services
exten => 10177,1,Dial(SIP/10177@emergency-provider)
exten => 10177,n,Hangup()

exten => 10111,1,Dial(SIP/10111@emergency-provider)
exten => 10111,n,Hangup()

exten => 107,1,Dial(SIP/107@emergency-provider)
exten => 107,n,Hangup()

exten => 112,1,Dial(SIP/112@emergency-provider)
exten => 112,n,Hangup()

; International calls (optional)
exten => _00.,1,Dial(SIP/\${EXTEN}@international-provider)
exten => _00.,n,Hangup()`;

    navigator.clipboard.writeText(config);
    toast({
      title: "Configuration Copied",
      description: "Asterisk dial plan configuration copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold uppercase tracking-wide flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            South African Dialing Plan
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Configure dialing patterns for South African numbers and emergency services
          </p>
        </div>
        <Button onClick={copyAsteriskConfig} variant="outline">
          Copy Asterisk Config
        </Button>
      </div>

      {/* Dial Plan Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dialPlans.map((plan, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Badge variant={plan.enabled ? "default" : "secondary"}>
                  {plan.pattern}
                </Badge>
                <Badge variant={plan.enabled ? "default" : "outline"}>
                  {plan.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
            
            <h5 className="font-medium mb-1">{plan.description}</h5>
            <p className="text-sm text-muted-foreground">
              Example: {plan.example}
            </p>
          </Card>
        ))}
      </div>

      {/* Test Dialing */}
      <Card className="p-6">
        <h5 className="font-semibold mb-4 flex items-center">
          <TestTube className="w-5 h-5 mr-2" />
          Test Dialing Plan
        </h5>
        
        <div className="flex space-x-4 items-end">
          <div className="flex-1">
            <Label htmlFor="testNumber">Test Number</Label>
            <Input
              id="testNumber"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="Enter number to test (e.g., 0111234567, 1001)"
            />
          </div>
          <Button onClick={testDialPlan}>
            <Phone className="w-4 h-4 mr-2" />
            Test
          </Button>
        </div>
        
        {testResult && (
          <div className="mt-4 p-3 rounded-lg bg-muted">
            <p className="text-sm">{testResult}</p>
          </div>
        )}
      </Card>

      {/* South African Number Formats */}
      <Card className="p-6 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <h5 className="font-semibold text-green-800 dark:text-green-200 mb-3">
          South African Number Formats
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700 dark:text-green-300">
          <div>
            <p className="font-medium mb-2">Landlines:</p>
            <ul className="space-y-1">
              <li>• Johannesburg: 011 XXX XXXX</li>
              <li>• Cape Town: 021 XXX XXXX</li>
              <li>• Durban: 031 XXX XXXX</li>
              <li>• Pretoria: 012 XXX XXXX</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Mobile Networks:</p>
            <ul className="space-y-1">
              <li>• Vodacom: 082, 083, 084</li>
              <li>• MTN: 083, 076, 078</li>
              <li>• Cell C: 084, 074</li>
              <li>• Telkom: 081</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Emergency:</p>
            <ul className="space-y-1">
              <li>• Police: 10111, 10177</li>
              <li>• Medical: 107</li>
              <li>• International: 112</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Special Services:</p>
            <ul className="space-y-1">
              <li>• Directory: 1023</li>
              <li>• Time: 1026</li>
              <li>• Weather: 1150</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};
