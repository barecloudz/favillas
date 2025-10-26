import { Helmet } from "react-helmet";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Favilla's NY Pizza</title>
      </Helmet>

      <main className="min-h-screen bg-gray-50 py-8 md:pt-[72px] pt-14">
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
              <p className="text-center text-gray-600 text-sm mt-2">
                Last Updated: {new Date().toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
                <p className="text-gray-700 mb-2">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Account Information:</strong> Name, email address, phone number, and delivery address</li>
                  <li><strong>Order Information:</strong> Items ordered, order history, special instructions, and preferences</li>
                  <li><strong>Payment Information:</strong> Credit/debit card information (processed securely through our payment processor)</li>
                  <li><strong>Communications:</strong> Your communications with us, including customer service inquiries</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
                <p className="text-gray-700 mb-2">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Process and fulfill your orders</li>
                  <li>Send order confirmations and updates via email</li>
                  <li>Communicate with you about your orders</li>
                  <li>Manage your rewards account and points</li>
                  <li>Improve our services and customer experience</li>
                  <li>Send promotional offers (with your consent)</li>
                  <li>Prevent fraud and enhance security</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
                <p className="text-gray-700 mb-2">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Service Providers:</strong> Third-party companies that help us operate our business (payment processors, email services, etc.)</li>
                  <li><strong>Delivery Partners:</strong> Information necessary to complete delivery orders</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Email Communications</h2>
                <p className="text-gray-700 mb-2">
                  We use email to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Send order confirmations (required for all orders)</li>
                  <li>Provide order status updates</li>
                  <li>Send receipts and transaction records</li>
                  <li>Communicate important account information</li>
                  <li>Send promotional offers (you may opt-out at any time)</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  You can unsubscribe from promotional emails by clicking the unsubscribe link in any promotional email, but you will continue to receive transactional emails related to your orders.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
                <p className="text-gray-700">
                  We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.
                </p>
                <p className="text-gray-700 mt-2">
                  Payment information is processed through secure, PCI-compliant payment processors. We do not store complete credit card information on our servers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Cookies & Tracking</h2>
                <p className="text-gray-700 mb-2">
                  We use cookies and similar tracking technologies to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Remember your preferences and login status</li>
                  <li>Analyze site traffic and usage patterns</li>
                  <li>Improve website functionality</li>
                  <li>Personalize your experience</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  You can control cookies through your browser settings, but some features of our website may not function properly if cookies are disabled.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
                <p className="text-gray-700 mb-2">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Access and review your personal information</li>
                  <li>Request correction of inaccurate information</li>
                  <li>Request deletion of your account and data</li>
                  <li>Opt-out of promotional communications</li>
                  <li>Update your account information at any time</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  To exercise these rights, please contact us using the information provided below.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
                <p className="text-gray-700">
                  Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Third-Party Services</h2>
                <p className="text-gray-700 mb-2">
                  Our website may contain links to third-party websites or integrate with third-party services:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li><strong>Google OAuth:</strong> For account authentication (governed by Google's privacy policy)</li>
                  <li><strong>Payment Processors:</strong> Stripe for secure payment processing</li>
                  <li><strong>Email Service:</strong> Resend for email delivery</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  These third parties have their own privacy policies, and we are not responsible for their practices.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Data Retention</h2>
                <p className="text-gray-700">
                  We retain your personal information for as long as necessary to fulfill the purposes outlined in this privacy policy, unless a longer retention period is required or permitted by law. Order history and transaction records are retained for accounting and legal compliance purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
                <p className="text-gray-700">
                  We may update this privacy policy from time to time. We will notify you of any material changes by posting the new privacy policy on this page and updating the "Last Updated" date. Your continued use of our services after any changes constitutes acceptance of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
                <p className="text-gray-700">
                  If you have questions or concerns about this privacy policy or our data practices, please contact us at:
                </p>
                <p className="text-gray-700 mt-2">
                  <strong>Favilla's NY Pizza</strong><br />
                  Email: info@favillaspizzeria.com<br />
                  Phone: (your phone number)
                </p>
              </section>

              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  By using our services, you acknowledge that you have read and understood this Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
