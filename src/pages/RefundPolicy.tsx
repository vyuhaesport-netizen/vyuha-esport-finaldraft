import AppLayout from '@/components/layout/AppLayout';

const RefundPolicy = () => {
  return (
    <AppLayout title="Refund Policy">
      <div className="p-4 pb-8">
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">Refund Eligibility</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At Vyuha Esport, we strive to provide fair policies for all our users. Refunds are available under specific circumstances outlined below.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">Tournament Entry Fees</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Before Tournament Start:</strong> Full refund available if requested at least 24 hours before the tournament begins.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>Within 24 Hours of Start:</strong> 50% refund may be granted at our discretion.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong>After Tournament Start:</strong> No refunds will be issued once the tournament has begun.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">Cancelled Tournaments</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If a tournament is cancelled by Vyuha Esport or the organizer, all participants will receive a full refund of their entry fee within 3-5 business days. You will be notified via email and in-app notification.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">Technical Issues</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you experience technical issues on our platform that prevent you from participating, please contact support immediately. Refunds for technical issues are evaluated on a case-by-case basis with appropriate evidence.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">Wallet Balance</h2>
            <ul className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Wallet deposits are non-refundable but can be used for future tournaments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Winnings can be withdrawn to your registered payment method.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Minimum withdrawal amount is ₹100.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">How to Request a Refund</h2>
            <ol className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Go to Help & Support in your profile</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Select "Request Refund" option</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Provide tournament details and reason for refund</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Our team will review and respond within 48 hours</span>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">Processing Time</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Approved refunds are processed within 5-7 business days. The refund will be credited to your original payment method or wallet, depending on your preference.
            </p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">
            For any questions regarding refunds, contact us at support@vyuhaesport.com
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default RefundPolicy;