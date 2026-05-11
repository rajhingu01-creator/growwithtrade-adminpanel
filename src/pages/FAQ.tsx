import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, HelpCircle, ChevronDown, ChevronUp, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

const FAQItem = ({ question, answer }: { question: string; answer: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-800/50 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left hover:text-blue-400 transition-colors group"
      >
        <span className="text-sm font-bold text-slate-200 group-hover:text-blue-400">{question}</span>
        {isOpen ? <ChevronUp size={18} className="text-blue-500" /> : <ChevronDown size={18} className="text-slate-500" />}
      </button>
      {isOpen && (
        <div className="pb-5 text-sm text-slate-400 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
          {answer}
        </div>
      )}
    </div>
  );
};

export const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0b0e11] text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors mb-8 group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-10 border-b border-slate-800 pb-6">
            <div className="bg-blue-500/10 p-3 rounded-xl">
              <HelpCircle className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Frequently Asked Questions</h1>
              <p className="text-slate-500 text-sm mt-1">Find answers to common questions about our platform</p>
            </div>
          </div>

          <div className="space-y-12">
            {/* Binary Trading Section */}
            <section>
              <h2 className="text-lg font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                Binary Trading Basics
              </h2>
              <div className="bg-slate-950/50 rounded-xl px-6 border border-slate-800/50">
                <FAQItem 
                  question="1. What is Binary Trading?" 
                  answer="Binary trading is a type of financial trading where users predict whether the price of an asset will go up or down within a fixed time. If the prediction is correct, a fixed payout is earned; otherwise, the invested amount is lost." 
                />
                <FAQItem 
                  question="2. How does Binary Trading work?" 
                  answer="You select an asset, choose direction (UP or DOWN), set an amount, and pick an expiry time. If your prediction is correct at expiry, you earn profit; if not, you lose your investment." 
                />
                <FAQItem 
                  question="3. What assets can I trade?" 
                  answer={
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Currency pairs (Forex)</li>
                      <li>Stocks</li>
                      <li>Commodities</li>
                      <li>Indices</li>
                    </ul>
                  } 
                />
                <FAQItem 
                  question="4. What is the minimum deposit?" 
                  answer="Minimum deposit depends on platform rules. Typically, it starts from a small amount to allow beginners to start trading." 
                />
                <FAQItem 
                  question="5. How much profit can I earn?" 
                  answer="Profit is fixed per trade and depends on payout percentage. Usually ranges between 60% to 90% per successful trade." 
                />
                <FAQItem 
                  question="6. Can I lose money?" 
                  answer={<span className="text-rose-400 font-bold">Yes. Binary trading is high-risk. If your prediction is wrong, you lose your full investment amount.</span>} 
                />
                <FAQItem 
                  question="7. Is Binary Trading safe?" 
                  answer="Binary trading is risky and not suitable for everyone. You should trade only with money you can afford to lose." 
                />
                <FAQItem 
                  question="8. Is Binary Trading legal?" 
                  answer={
                    <div className="space-y-2">
                      <p className="font-bold text-amber-500 uppercase text-xs">Important Information:</p>
                      <p>Binary trading is restricted or banned in many countries including India and is often offered by offshore platforms without regulation.</p>
                    </div>
                  } 
                />
                <FAQItem 
                  question="9. How do I create an account?" 
                  answer="Click on “Sign Up”, enter your details, verify your email, and start trading." 
                />
                <FAQItem 
                  question="14. What is expiry time?" 
                  answer="Expiry time is the duration of your trade (e.g., 1 min, 5 min, 1 hour). Your result depends on price at this exact time." 
                />
                <FAQItem 
                  question="17. Is Binary Trading gambling?" 
                  answer="Technically it's trading, but due to fixed outcome and high risk, many consider it similar to gambling." 
                />
                <FAQItem 
                  question="18. Can I earn consistently?" 
                  answer={<p className="italic underline">Real answer: Most users lose money long-term due to risk and payout structure.</p>} 
                />
                <FAQItem 
                  question="20. Do you guarantee profit?" 
                  answer={<p className="text-rose-500 font-bold">No. There is no guarantee of profit in binary trading.</p>} 
                />
              </div>
            </section>

            {/* Deposits Section */}
            <section>
              <h2 className="text-lg font-black text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                Deposits (Adding Funds)
              </h2>
              <div className="bg-slate-950/50 rounded-xl px-6 border border-slate-800/50">
                <FAQItem 
                  question="1. How can I deposit funds?" 
                  answer={
                    <div className="space-y-2">
                      <p>You can deposit funds using the following methods:</p>
                      <ul className="list-disc pl-5">
                        <li>Cryptocurrency (USDT, BTC, etc.)</li>
                        <li>UPI / Wallet (if available)</li>
                        <li>Bank Transfer</li>
                      </ul>
                    </div>
                  } 
                />
                <FAQItem 
                  question="2. What is the minimum deposit amount?" 
                  answer="The minimum deposit amount varies depending on the payment method but usually starts from a small amount for user convenience." 
                />
                <FAQItem 
                  question="3. How long does a deposit take?" 
                  answer={
                    <ul className="list-disc pl-5">
                      <li>Crypto: Usually within 5–30 minutes</li>
                      <li>UPI / Bank: Instant to a few hours</li>
                      <li className="text-slate-500 italic">(Delays may occur due to network or payment issues)</li>
                    </ul>
                  } 
                />
                <FAQItem 
                  question="4. Are there any deposit fees?" 
                  answer="We do not charge deposit fees. However, your payment provider or blockchain network may apply charges." 
                />
              </div>
            </section>

            {/* Withdrawals Section */}
            <section>
              <h2 className="text-lg font-black text-rose-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-rose-500 rounded-full"></div>
                Withdrawals (Withdrawing Funds)
              </h2>
              <div className="bg-slate-950/50 rounded-xl px-6 border border-slate-800/50">
                <FAQItem 
                  question="6. How can I withdraw my funds?" 
                  answer="Go to the withdrawal section, enter the amount, select your payment method, and submit the request." 
                />
                <FAQItem 
                  question="8. How long do withdrawals take?" 
                  answer={
                    <ul className="list-disc pl-5">
                      <li>Crypto: 1–24 hours</li>
                      <li>Bank / UPI: 1–3 business days</li>
                    </ul>
                  } 
                />
                <FAQItem 
                  question="10. Do I need verification (KYC)?" 
                  answer="Yes, in some cases, identity verification may be required before processing withdrawals to prevent fraud." 
                />
                <FAQItem 
                  question="12. Can my withdrawal be rejected?" 
                  answer={
                    <div className="space-y-2">
                      <p>Yes, withdrawals may be rejected if:</p>
                      <ul className="list-disc pl-5">
                        <li>Suspicious activity is detected</li>
                        <li>Terms & conditions are violated</li>
                        <li>Incorrect details are provided</li>
                      </ul>
                    </div>
                  } 
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
