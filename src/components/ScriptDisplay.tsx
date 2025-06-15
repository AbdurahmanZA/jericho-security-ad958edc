
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Terminal, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScriptDisplayProps {
  scriptKey: string;
  script: string;
  title: string;
  description: string;
  icon: 'terminal' | 'download';
  prerequisites?: string;
  usage?: string;
  features?: string[];
  ports?: string;
}

const ScriptDisplay: React.FC<ScriptDisplayProps> = ({
  scriptKey,
  script,
  title,
  description,
  icon,
  prerequisites,
  usage,
  features,
  ports
}) => {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, scriptName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(scriptName);
      setTimeout(() => setCopiedScript(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: `${scriptName} installation script copied`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the script manually",
        variant: "destructive",
      });
    }
  };

  const IconComponent = icon === 'terminal' ? Terminal : Download;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <IconComponent className="w-5 h-5" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto max-h-96">
            <code>{script}</code>
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copyToClipboard(script, title)}
          >
            {copiedScript === title ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {(prerequisites || usage || features || ports) && (
          <div className="mt-4 text-sm text-muted-foreground space-y-2">
            {prerequisites && (
              <p><strong>Prerequisites:</strong> {prerequisites}</p>
            )}
            {ports && (
              <p><strong>Ports:</strong> {ports}</p>
            )}
            {features && (
              <>
                <p><strong>What it does:</strong></p>
                <ul className="list-disc ml-4 space-y-1">
                  {features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </>
            )}
            {usage && (
              <p><strong>Usage:</strong> {usage}</p>
            )}
            {scriptKey === 'linux' && (
              <p><strong>Important:</strong> Update the GitHub repository URL in the script before running</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScriptDisplay;
