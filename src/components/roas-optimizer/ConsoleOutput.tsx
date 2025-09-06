import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface ConsoleOutputProps {
  messages: string[];
  error: string | null;
}

export const ConsoleOutput = ({ messages, error }: ConsoleOutputProps) => {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="card-enhanced">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          🧪 Console
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-wrap">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        <div 
          ref={consoleRef}
          className="h-28 overflow-auto bg-muted/20 border border-border rounded-lg p-3 font-mono text-sm text-muted-foreground"
        >
          {messages.length === 0 ? (
            <div className="text-muted-foreground/50">Console output will appear here...</div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className="mb-1">
                {message}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};