import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield } from 'lucide-react';

export const TermsAndConditions = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      window.close();
      // Fallback if window.close() is blocked
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-slate-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors mb-8 group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Registration</span>
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
            <div className="bg-blue-500/10 p-3 rounded-xl">
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Terms and Conditions</h1>
              <p className="text-slate-500 text-sm mt-1">Last Updated: May 2026</p>
            </div>
          </div>

          <div className="space-y-8 text-slate-400 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
              <p>Welcome to Trade With Grow. By accessing or using our platform, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, you must not use our services.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 text-rose-500">2. Risk Disclaimer</h2>
              <p>Trading binary options involves a high level of risk and may not be suitable for all users. You may lose all of your invested capital. You should only trade with money you can afford to lose.</p>
              <p className="mt-2 font-semibold">Trade With Grow does not provide financial, investment, or trading advice. All decisions are made solely by the user.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Eligibility</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You must be at least 18 years old.</li>
                <li>You must comply with the laws and regulations of your country.</li>
                <li>Users from restricted jurisdictions are not allowed to use the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Account Registration</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Users must provide accurate and complete information.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>Trade With Grow reserves the right to suspend or terminate accounts suspected of fraudulent activity.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Deposits and Withdrawals</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Users may fund accounts through approved payment methods.</li>
                <li>Withdrawals are subject to verification procedures (KYC).</li>
                <li>Trade With Grow reserves the right to delay or reject withdrawals in cases of suspected fraud, abuse, or violation of terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Bonuses and Promotions</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Any bonuses offered may come with specific trading requirements.</li>
                <li>Trade With Grow reserves the right to modify or cancel promotions at any time.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 text-amber-500">7. Prohibited Activities</h2>
              <p className="mb-2 font-medium">Users must not:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Engage in fraudulent or illegal activities</li>
                <li>Use bots, automation, or manipulation techniques</li>
                <li>Attempt to exploit system errors or pricing inaccuracies</li>
              </ul>
              <p className="mt-2 text-rose-400 font-bold italic">Violation may result in account suspension and fund forfeiture.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">8. Platform Availability</h2>
              <p>We strive to maintain uninterrupted service but do not guarantee that the platform will always be available. Technical issues, maintenance, or external factors may cause downtime.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3 text-rose-400">9. Limitation of Liability</h2>
              <p className="mb-2 font-medium">Trade With Grow shall not be liable for:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Trading losses</li>
                <li>Technical failures or delays</li>
                <li>Unauthorized account access due to user negligence</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">10. Intellectual Property</h2>
              <p>All content, branding, and technology on this platform are the property of Trade With Grow and may not be copied or used without permission.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">11. Termination</h2>
              <p>We reserve the right to suspend or terminate any account at our discretion if there is a violation of these Terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">12. Changes to Terms</h2>
              <p>Trade With Grow may update these Terms at any time. Continued use of the platform means you accept the updated terms.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">13. Governing Law</h2>
              <p>These Terms shall be governed by and interpreted in accordance with applicable laws. Users are responsible for ensuring their use of the platform is legal in their jurisdiction.</p>
            </section>
          </div>
          
          <div className="mt-12 pt-8 border-t border-slate-800 text-center">
            <button 
              onClick={handleBack}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              I Understand and Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
