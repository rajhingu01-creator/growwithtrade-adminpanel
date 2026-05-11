import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, Copy, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../store/useAuthStore';

const PAYMENT_OPTIONS = ['CONFIRMO'];

const CRYPTO_OPTIONS = [
  { name: 'USDC', symbol: 'USDC', rate: 0.998, logo: 'https://cdn.simpleicons.org/usdcoin/2775CA', fallback: '$' },
  { name: 'USDT', symbol: 'USDT', rate: 0.9982, logo: 'https://cdn.simpleicons.org/tether/26A17B', fallback: 'T' },
  { name: 'Bitcoin', symbol: 'BTC', rate: 70200, logo: 'https://cdn.simpleicons.org/bitcoin/F7931A', fallback: 'B' },
  { name: 'Ethereum', symbol: 'ETH', rate: 2170, logo: 'https://cdn.simpleicons.org/ethereum/3C3C3D', fallback: 'E' },
  { name: 'Solana', symbol: 'SOL', rate: 81, logo: 'https://cdn.simpleicons.org/solana/14F195', fallback: 'S' },
  { name: 'Litecoin', symbol: 'LTC', rate: 52.6, logo: 'https://cdn.simpleicons.org/litecoin/345D9D', fallback: 'L' },
  { name: 'Tron', symbol: 'TRX', rate: 0.319, logo: 'https://cdn.simpleicons.org/tron/EF0027', fallback: 'T' },
];

export const DirectTransferPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const amount = new URLSearchParams(location.search).get('amount') || '0';
  const usdAmount = Number(amount) || 0;
  
  const [dynamicAddresses, setDynamicAddresses] = React.useState<Record<string, string>>({});
  const [showCurrencyStep, setShowCurrencyStep] = React.useState(false);
  
  React.useEffect(() => {
    fetch('/api/settings/crypto-addresses')
      .then(res => res.json())
      .then(data => setDynamicAddresses(data))
      .catch(err => console.error('Failed to fetch crypto addresses:', err));
  }, []);
  const [search, setSearch] = React.useState('');
  const [selectedCoin, setSelectedCoin] = React.useState<(typeof CRYPTO_OPTIONS)[number] | null>(null);
  const [selectedNetwork, setSelectedNetwork] = React.useState<{ name: string; symbol: string; multiplier: number; logo: string } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = React.useState(15 * 60);
  const [copiedAddress, setCopiedAddress] = React.useState(false);
  const [isQrOpen, setIsQrOpen] = React.useState(false);
  const [createdPendingFor, setCreatedPendingFor] = React.useState('');

  const NETWORK_OPTIONS: Record<string, { name: string; symbol: string; multiplier: number; logo: string }[]> = {
    USDT: [
      { name: 'Tron', symbol: 'TRX', multiplier: 1.01, logo: 'https://cdn.simpleicons.org/tron/EF0027' },
      { name: 'Ethereum', symbol: 'ETH', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/ethereum/3C3C3D' },
      { name: 'Solana', symbol: 'SOL', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/solana/14F195' },
    ],
    USDC: [
      { name: 'Ethereum', symbol: 'ETH', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/ethereum/3C3C3D' },
      { name: 'Solana', symbol: 'SOL', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/solana/14F195' },
    ],
    BTC: [
      { name: 'Bitcoin', symbol: 'BTC', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/bitcoin/F7931A' },
    ],
    ETH: [
      { name: 'Ethereum', symbol: 'ETH', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/ethereum/3C3C3D' },
      { name: 'Arbitrum', symbol: 'ARB', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/arbitrum/28A0F0' },
    ],
    SOL: [
      { name: 'Solana', symbol: 'SOL', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/solana/14F195' },
    ],
    LTC: [
      { name: 'Litecoin', symbol: 'LTC', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/litecoin/345D9D' },
    ],
    TRX: [
      { name: 'Tron', symbol: 'TRX', multiplier: 1.0, logo: 'https://cdn.simpleicons.org/tron/EF0027' },
    ],
  };

  const filteredOptions = CRYPTO_OPTIONS.filter((coin) =>
    `${coin.name} ${coin.symbol}`.toLowerCase().includes(search.toLowerCase())
  );

  React.useEffect(() => {
    if (!selectedCoin || !selectedNetwork) return;
    setRemainingSeconds(15 * 60);
  }, [selectedCoin, selectedNetwork]);

  React.useEffect(() => {
    if (!selectedCoin || !selectedNetwork) return;
    if (remainingSeconds <= 0) {
      try {
        window.close();
      } catch {
        // Browser may block close; ignore.
      }
      navigate('/deposit', { replace: true });
      return;
    }
    const timerId = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [selectedCoin, selectedNetwork, remainingSeconds, navigate]);

  React.useEffect(() => {
    if (!selectedCoin || !selectedNetwork || !token) return;
    const key = `${selectedCoin.symbol}:${selectedNetwork.name}:${usdAmount}`;
    if (createdPendingFor === key) return;

    const submitPending = async () => {
      try {
        await fetch('/api/user/deposit/manual-crypto', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            amount: usdAmount,
            userAddress: `${selectedCoin.symbol}-${selectedNetwork.name}-AUTO`,
            currency: 'USD'
          })
        });
        setCreatedPendingFor(key);
      } catch {
        // Ignore transient errors in mock payment flow
      }
    };
    submitPending();
  }, [selectedCoin, selectedNetwork, token, usdAmount, createdPendingFor]);

  if (showCurrencyStep) {
    const selectedNetworkOptions = selectedCoin ? (NETWORK_OPTIONS[selectedCoin.symbol] || []) : [];
    const walletAddressByNetwork: Record<string, string> = {
      Ethereum: '0x35B85B3490540636F5a7CD3FAb2176B5CbfF50EB',
      Tron: 'TYH9jP7qW4XzM2V1k8L5N3B6S0R4D7F2A',
      Solana: '9xQeWvG816bUx9EPfV8H5iQjv6L8kM3y2Y7e4Tb8pFhW',
      Bitcoin: 'bc1q2f4d8t0c9v7k3s6m5n1p8z4x2q7w9e6r5t3y1u',
      Litecoin: 'ltc1q3h7g4j8k2m5p9r6t1v3x7z4c8b2n5d9f6s3a1',
      Arbitrum: '0x35B85B3490540636F5a7CD3FAb2176B5CbfF50EB',
    };
    const walletAddressByCoinNetwork: Record<string, string> = {
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
    };

    // Use dynamic addresses from DB if available, fallback to hardcoded ones
    const finalAddresses = { ...walletAddressByCoinNetwork, ...dynamicAddresses };

    const networkNoteByCoinNetwork: Record<string, string> = {
      'LTC:Litecoin': 'Please note that confidential deposits via the MWEB function are not supported and will result in deposits being lost.',
      'SOL:Solana': 'Please note that SOL addresses are case sensitive.',
      'BTC:Bitcoin': 'Binance supports deposits from all BTC addresses (starting with "1", "3", "bc1p" and "bc1q").',
    };

    if (selectedCoin && selectedNetwork) {
      const totalToPay = (usdAmount / selectedCoin.rate) * selectedNetwork.multiplier;
      const formattedTotal =
        selectedCoin.symbol === 'BTC' || selectedCoin.symbol === 'ETH' || selectedCoin.symbol === 'SOL'
          ? totalToPay.toFixed(8)
          : totalToPay.toFixed(6);
      const coinNetworkKey = `${selectedCoin.symbol}:${selectedNetwork.name}`;
      const walletAddress =
        finalAddresses[coinNetworkKey] ||
        walletAddressByNetwork[selectedNetwork.name] ||
        walletAddressByNetwork.Ethereum;
      const networkNote = networkNoteByCoinNetwork[coinNetworkKey];
      const copyWalletAddress = async () => {
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(walletAddress);
            setCopiedAddress(true);
            window.setTimeout(() => setCopiedAddress(false), 1500);
          } catch (err) {
            console.error('Clipboard copy failed', err);
          }
        } else {
          // Fallback for non-secure contexts
          const textArea = document.createElement("textarea");
          textArea.value = walletAddress;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
            setCopiedAddress(true);
            window.setTimeout(() => setCopiedAddress(false), 1500);
          } catch (err) {
            console.error('Fallback copy failed', err);
          }
          document.body.removeChild(textArea);
        }
      };

      return (
        <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-purple-600 via-violet-400 to-yellow-300 p-4 sm:p-8">
          <div className="max-w-2xl mx-auto bg-[#e7e7ea] rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white shadow flex items-center justify-center overflow-hidden">
                <img
                  src={selectedCoin.logo}
                  alt={`${selectedCoin.name} logo`}
                  className="w-9 h-9 object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = 'none';
                    const fallback = img.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="hidden w-9 h-9 rounded-full bg-slate-100 text-slate-600 items-center justify-center text-base font-black">
                  {selectedCoin.fallback}
                </div>
              </div>
              <div>
                <h2 className="text-5xl font-black text-slate-900 leading-none">Payment</h2>
                <p className="text-slate-500 text-sm">Payment</p>
              </div>
            </div>

            <div className="bg-[#f2f2f2] rounded-t-[2rem] p-6 sm:p-8 text-center">
              <p className="text-orange-500 text-lg font-medium mb-5">
                Send {selectedCoin.symbol} on the {selectedNetwork.name} blockchain, otherwise your funds will be lost.
              </p>

              {networkNote && (
                <div className="mb-5 bg-slate-700/15 border border-slate-300 rounded-xl p-3 text-left text-slate-600 text-sm">
                  {networkNote}
                </div>
              )}
              <p className="text-4xl font-bold text-slate-700 mb-2">Total to pay</p>
              <p className="text-6xl font-black text-slate-800 mb-6">{formattedTotal} {selectedCoin.symbol}</p>

              <div className="border-t border-slate-300 pt-6">
                <p className="text-3xl font-semibold text-slate-700 mb-5">{selectedNetwork.name} address:</p>
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-4 flex items-center gap-4 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-400 text-sm mb-1">Address</p>
                    <p className="text-amber-400 font-bold break-all text-2xl leading-snug">{walletAddress}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQrOpen(true)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white shrink-0"
                    title="Show QR"
                  >
                    <QrCode size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={copyWalletAddress}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white shrink-0"
                    title="Copy address"
                  >
                    {copiedAddress ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="mt-8 h-1 w-full bg-slate-200 rounded">
                <div className="h-1 bg-yellow-400 rounded" style={{ width: `${(remainingSeconds / (15 * 60)) * 100}%` }} />
              </div>
              <p className="text-slate-500 text-xl mt-4">
                Invoice expires in <span className="font-bold text-slate-800">{Math.floor(remainingSeconds / 60)}m {String(remainingSeconds % 60).padStart(2, '0')}s</span>.
              </p>

              <div className="mt-8 text-center space-y-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  I Have Paid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNetwork(null);
                    setRemainingSeconds(15 * 60);
                  }}
                  className="text-3xl underline text-slate-800 font-medium"
                >
                  Back to networks
                </button>
              </div>

              {isQrOpen && (
                <div
                  className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                  onClick={() => setIsQrOpen(false)}
                >
                  <div
                    className="bg-white rounded-2xl p-6 w-full max-w-sm text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4 className="text-slate-800 font-bold text-xl mb-4">Scan QR</h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 inline-flex">
                      <QRCodeSVG value={walletAddress} size={220} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQrOpen(false)}
                      className="mt-5 px-4 py-2 rounded-lg bg-slate-900 text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-purple-600 via-violet-400 to-yellow-300 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto bg-[#e7e7ea] rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-black text-slate-900">Payment</h2>
              <p className="text-slate-500 text-sm">Payment</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-black text-slate-800">{usdAmount.toFixed(2)} USD</p>
            </div>
          </div>

          <div className="bg-[#f2f2f2] rounded-t-[2rem] p-6 sm:p-8">
            {!selectedCoin ? (
              <>
                <h3 className="text-center text-3xl font-bold text-slate-700 mb-5">Pay with</h3>
                <div className="relative mb-8">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for a cryptocurrency..."
                    className="w-full bg-[#e8e8ea] rounded-full py-3 pl-6 pr-12 text-lg text-slate-700 outline-none"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl">⌕</span>
                </div>

                <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
                  {filteredOptions.map((coin) => {
                    const coinAmount = coin.symbol === 'BTC' || coin.symbol === 'ETH' || coin.symbol === 'SOL'
                      ? (usdAmount / coin.rate).toFixed(8)
                      : (usdAmount / coin.rate).toFixed(5);
                    return (
                      <button
                        key={coin.symbol}
                        type="button"
                        onClick={() => setSelectedCoin(coin)}
                        className="w-full flex items-center gap-4 bg-white/70 rounded-2xl px-4 py-3 text-left"
                      >
                        <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center overflow-hidden">
                          <img
                            src={coin.logo}
                            alt={`${coin.name} logo`}
                            className="w-8 h-8 object-contain"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.style.display = 'none';
                              const fallback = img.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="hidden w-8 h-8 rounded-full bg-slate-100 text-slate-600 items-center justify-center text-sm font-black">
                            {coin.fallback}
                          </div>
                        </div>
                        <div>
                          <p className="text-3xl font-semibold text-slate-900 leading-none">{coin.name}</p>
                          <p className="text-slate-500 text-xl">{coinAmount} {coin.symbol}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <button
                    type="button"
                    onClick={() => setSelectedCoin(null)}
                    className="text-3xl text-slate-700"
                  >
                    ←
                  </button>
                  <h3 className="text-center flex-1 text-3xl font-bold text-slate-700 leading-tight">
                    Select network to send<br />{selectedCoin.name} ({selectedCoin.symbol})
                  </h3>
                </div>

                <div className="space-y-5 max-h-[320px] overflow-y-auto pr-1">
                  {selectedNetworkOptions.map((network) => {
                    const selectedAmount = (usdAmount / selectedCoin.rate) * network.multiplier;
                    const formattedAmount =
                      selectedCoin.symbol === 'BTC' || selectedCoin.symbol === 'ETH' || selectedCoin.symbol === 'SOL'
                        ? selectedAmount.toFixed(8)
                        : selectedAmount.toFixed(6);
                    return (
                      <button
                        key={`${selectedCoin.symbol}-${network.name}`}
                        type="button"
                        onClick={() => setSelectedNetwork(network)}
                        className="w-full flex items-center gap-4 bg-white/70 rounded-2xl px-4 py-3 text-left"
                      >
                        <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center overflow-hidden">
                          <img
                            src={network.logo}
                            alt={`${network.name} logo`}
                            className="w-8 h-8 object-contain"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.style.display = 'none';
                              const fallback = img.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="hidden w-8 h-8 rounded-full bg-slate-100 text-slate-600 items-center justify-center text-sm font-black">
                            {network.symbol.slice(0, 1)}
                          </div>
                        </div>
                        <div>
                          <p className="text-3xl font-semibold text-slate-900 leading-none">{network.name}</p>
                          <p className="text-slate-500 text-xl">{formattedAmount} {selectedCoin.symbol}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-center text-slate-400 text-sm mt-6">
                  The amount in crypto may differ slightly after you have made your choice.
                </p>
              </>
            )}

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedNetwork(null);
                  setSelectedCoin(null);
                  setShowCurrencyStep(false);
                }}
                className="text-3xl underline text-slate-800 font-medium"
              >
                Back to Merchant
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
          <aside className="border-r border-slate-200 p-4 bg-slate-50">
            <p className="text-xs text-slate-500 mb-4 font-semibold">Pay Now</p>
            <div className="space-y-3">
              {PAYMENT_OPTIONS.map((item, idx) => (
                <button
                  key={item}
                  type="button"
                  className={`w-full h-16 rounded-lg border text-sm font-bold transition-colors ${
                    idx === 0
                      ? 'border-blue-400 bg-blue-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </aside>

          <main className="p-6 sm:p-10">
            <div className="flex justify-end text-sm text-slate-500 mb-4">Hello, Trader</div>
            <h2 className="text-3xl font-black text-center text-slate-800 mb-2">PAY WITH CONFIRMO</h2>
            <p className="text-center text-slate-500 mb-8">challenge fee {amount} USD</p>

            <div className="max-w-md mx-auto">
              <label className="block text-slate-500 text-sm mb-2">Amount</label>
              <input
                readOnly
                value={amount}
                className="w-full border-b border-slate-300 bg-transparent py-2 text-xl text-slate-800 text-center focus:outline-none"
              />
              <p className="text-center text-xs text-slate-400 mt-3">* Min-Max Amounts 1 - 10000 USD</p>

              <button
                type="button"
                onClick={() => setShowCurrencyStep(true)}
                className="w-full mt-6 bg-teal-400 hover:bg-teal-500 text-white font-bold py-3 rounded-full transition-colors"
              >
                Pay {amount} USD
              </button>
            </div>

            <div className="text-center mt-12">
              <Link
                to="/deposit"
                className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold transition-colors"
              >
                Back to website
              </Link>
            </div>

            <p className="text-center text-[11px] text-slate-400 mt-10">
              Provided services are integration and data transfer only and do not include transaction processing.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
};
