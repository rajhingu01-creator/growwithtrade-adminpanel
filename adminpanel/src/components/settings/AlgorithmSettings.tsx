import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { toast } from 'sonner';
import { BrainCircuit, Loader2 } from 'lucide-react';

const AlgorithmSettings: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await adminService.getAlgoStatus();
      setIsEnabled(data.isAlgoEnabled);
    } catch (error) {
      console.error('Failed to fetch algo status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await adminService.toggleAlgo(checked);
      setIsEnabled(checked);
      toast.success(`Algorithm ${checked ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      toast.error('Failed to update algorithm status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Algorithm Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trading Algorithm</CardTitle>
          <CardDescription>
            Enable or disable the anti-majority trading algorithm. When enabled, the system will subtly bias prices against the majority of active trades to maintain platform balance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="algo-switch" className="text-base font-semibold">
                Algorithm Status
              </Label>
              <p className="text-sm text-muted-foreground">
                Currently {isEnabled ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
              <Switch
                id="algo-switch"
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={isUpdating}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="text-yellow-600 dark:text-yellow-500 text-sm font-bold uppercase tracking-wider">
            Important Note
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Turning off the algorithm will make the market prices purely follow the base market feed and random jitter. This might result in higher payouts for users if they trade in large groups on the same side.
        </CardContent>
      </Card>
    </div>
  );
};

export default AlgorithmSettings;
