import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import { Wallet, Loader2, Save } from 'lucide-react';

const CryptoSettings: React.FC = () => {
  const [addresses, setAddresses] = useState<Record<string, string>>({
    'USDT:Tron': 'TMLcgiRDq33r5pnaTxLXjATEyTxf9Le6Ex',
    'TRX:Tron': 'TMLcgiRDq33r5pnaTxLXjATEyTxf9Le6Ex',
    'USDT:Ethereum': '0x25ef1840aee8817f41dfce17cb0c00c02844e780',
    'USDT:Solana': 'hbeizF6Zez22T73PADLknWuQNMduJ9tJykERgNrVkay',
    'USDC:Ethereum': '0x25ef1840aee8817f41dfce17cb0c00c02844e780',
    'USDC:Solana': 'hbeizF6Zez22T73PADLknWuQNMduJ9tJykERgNrVkay',
    'ETH:Ethereum': '0x25ef1840aee8817f41dfce17cb0c00c02844e780',
    'ETH:Arbitrum': '0x25ef1840aee8817f41dfce17cb0c00c02844e780',
    'SOL:Solana': 'hbeizF6Zez22T73PADLknWuQNMduJ9tJykERgNrVkay',
    'BTC:Bitcoin': 'bc1qgcjsnqh8hp4y50lzmp2szjfuj5tu3vqy93ez2y',
    'LTC:Litecoin': 'LZdJrEbmDqPzJfT9z2tH4tZFoTJ6SsZov',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const data = await adminService.getCryptoAddresses();
      if (Object.keys(data).length > 0) {
        setAddresses(data);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setAddresses(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await adminService.updateCryptoAddresses(addresses);
      toast.success('Crypto addresses updated successfully');
    } catch (error) {
      toast.error('Failed to update crypto addresses');
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Crypto Deposit Addresses</h1>
        </div>
        <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stablecoins (USDT/USDC)</CardTitle>
            <CardDescription>Manage addresses for USDT and USDC on different networks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>USDT (TRC20 - Tron)</Label>
              <Input 
                value={addresses['USDT:Tron']} 
                onChange={(e) => handleInputChange('USDT:Tron', e.target.value)} 
                placeholder="TRC20 Address"
              />
            </div>
            <div className="space-y-2">
              <Label>USDT (ERC20 - Ethereum)</Label>
              <Input 
                value={addresses['USDT:Ethereum']} 
                onChange={(e) => handleInputChange('USDT:Ethereum', e.target.value)} 
                placeholder="ERC20 Address"
              />
            </div>
            <div className="space-y-2">
              <Label>USDT (Solana)</Label>
              <Input 
                value={addresses['USDT:Solana']} 
                onChange={(e) => handleInputChange('USDT:Solana', e.target.value)} 
                placeholder="Solana Address"
              />
            </div>
            <div className="space-y-2">
              <Label>USDC (ERC20 - Ethereum)</Label>
              <Input 
                value={addresses['USDC:Ethereum']} 
                onChange={(e) => handleInputChange('USDC:Ethereum', e.target.value)} 
                placeholder="ERC20 Address"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Main Cryptocurrencies</CardTitle>
            <CardDescription>Manage addresses for BTC, ETH, SOL, etc.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bitcoin (BTC)</Label>
              <Input 
                value={addresses['BTC:Bitcoin']} 
                onChange={(e) => handleInputChange('BTC:Bitcoin', e.target.value)} 
                placeholder="BTC Address"
              />
            </div>
            <div className="space-y-2">
              <Label>Ethereum (ETH)</Label>
              <Input 
                value={addresses['ETH:Ethereum']} 
                onChange={(e) => handleInputChange('ETH:Ethereum', e.target.value)} 
                placeholder="ETH Address"
              />
            </div>
            <div className="space-y-2">
              <Label>Solana (SOL)</Label>
              <Input 
                value={addresses['SOL:Solana']} 
                onChange={(e) => handleInputChange('SOL:Solana', e.target.value)} 
                placeholder="SOL Address"
              />
            </div>
            <div className="space-y-2">
              <Label>Tron (TRX)</Label>
              <Input 
                value={addresses['TRX:Tron']} 
                onChange={(e) => handleInputChange('TRX:Tron', e.target.value)} 
                placeholder="TRX Address"
              />
            </div>
            <div className="space-y-2">
              <Label>Litecoin (LTC)</Label>
              <Input 
                value={addresses['LTC:Litecoin']} 
                onChange={(e) => handleInputChange('LTC:Litecoin', e.target.value)} 
                placeholder="LTC Address"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CryptoSettings;
