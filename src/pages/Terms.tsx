import AppLayout from '@/components/layout/AppLayout';

const Terms = () => {
  return (
    <AppLayout title="Terms & Conditions">
      <div className="p-4 pb-8">
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing and using Vyuha Esport, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">2. User Registration</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Users must register with valid credentials to participate in tournaments. You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">3. Tournament Participation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All participants must follow the rules set for each tournament. Any form of cheating, hacking, or unsportsmanlike behavior will result in immediate disqualification and potential account ban. Tournament organizers reserve the right to modify rules at any time.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">4. Payments & Entry Fees</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Entry fees are non-refundable once a tournament has started. Prize money will be distributed according to the tournament rules within 7 business days of tournament completion. All payments are processed securely through our platform.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">5. User Conduct</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Users must not engage in any behavior that is abusive, threatening, or harmful to other users. This includes but is not limited to hate speech, harassment, and sharing of inappropriate content. Violation may result in account termination.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">6. Intellectual Property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All content on Vyuha Esport, including logos, graphics, and text, is the property of Vyuha Esport and protected by copyright laws. Users may not reproduce, distribute, or create derivative works without explicit permission.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">7. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vyuha Esport shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services. This includes damages for loss of profits, data, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="font-gaming text-lg font-bold mb-3">8. Modifications</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. Continued use of the service after modifications constitutes acceptance of the updated terms. Users will be notified of significant changes via email or in-app notification.
            </p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">
            Last updated: December 2024
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Terms;