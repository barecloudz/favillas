import { Helmet } from "react-helmet";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms & Conditions | Favilla's NY Pizza</title>
      </Helmet>

      <main className="min-h-screen bg-gray-50 py-8 md:pt-[72px] pt-14">
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-center">Terms & Conditions</CardTitle>
              <p className="text-center text-gray-600 text-sm mt-2">
                Last Updated: {new Date().toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p className="text-gray-700">
                  By accessing and placing an order with Favilla's NY Pizza, you confirm that you are in agreement with and bound by the terms and conditions contained in the Terms & Conditions outlined below. These terms apply to the entire website and any email or other type of communication between you and Favilla's NY Pizza.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Online Ordering</h2>
                <p className="text-gray-700 mb-2">
                  When you place an order through our website:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>You must provide accurate and complete information</li>
                  <li>You authorize us to charge your payment method for the total amount of your order</li>
                  <li>All orders are subject to acceptance and availability</li>
                  <li>We reserve the right to refuse or cancel any order at any time</li>
                  <li>Prices are subject to change without notice</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Payment & Pricing</h2>
                <p className="text-gray-700 mb-2">
                  Payment terms:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>All prices are in USD and include applicable taxes</li>
                  <li>Payment is due at the time of order placement</li>
                  <li>We accept major credit cards and debit cards</li>
                  <li>A card processing fee may apply to online orders</li>
                  <li>Delivery fees vary based on distance and are calculated at checkout</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. Delivery & Pickup</h2>
                <p className="text-gray-700 mb-2">
                  Delivery and pickup policies:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Delivery times are estimates and not guaranteed</li>
                  <li>Delivery is available within our designated delivery zones</li>
                  <li>You must be present to receive delivery orders</li>
                  <li>Pickup orders should be collected within 15 minutes of the scheduled time</li>
                  <li>We are not responsible for orders left unattended after delivery</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. Cancellations & Refunds</h2>
                <p className="text-gray-700 mb-2">
                  Cancellation and refund policy:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Orders may be cancelled before preparation begins</li>
                  <li>Refunds are issued at our discretion</li>
                  <li>Contact us immediately if there are issues with your order</li>
                  <li>No refunds are provided for customer error (wrong address, unavailable to receive order, etc.)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. Food Allergies & Dietary Restrictions</h2>
                <p className="text-gray-700 mb-2">
                  <strong className="text-red-600">Important Notice:</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>You must disclose any food allergies or dietary restrictions in your special instructions</li>
                  <li>Our kitchen handles common allergens including wheat, dairy, eggs, soy, and nuts</li>
                  <li>While we take precautions, we cannot guarantee allergen-free preparation</li>
                  <li><strong>Favilla's NY Pizza is not responsible for allergic reactions resulting from undisclosed allergies or dietary restrictions</strong></li>
                  <li>If you have severe allergies, please contact us directly before ordering</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. Rewards Program</h2>
                <p className="text-gray-700 mb-2">
                  Our rewards program:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Points are earned on eligible purchases</li>
                  <li>Points and rewards have no cash value</li>
                  <li>We reserve the right to modify or terminate the rewards program at any time</li>
                  <li>Points may expire according to program terms</li>
                  <li>Rewards cannot be transferred or sold</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
                <p className="text-gray-700">
                  To the fullest extent permitted by law, Favilla's NY Pizza shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. Modifications to Terms</h2>
                <p className="text-gray-700">
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to our website. Your continued use of our services following any changes constitutes acceptance of those changes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. Contact Information</h2>
                <p className="text-gray-700">
                  For questions about these Terms & Conditions, please contact us at:
                </p>
                <p className="text-gray-700 mt-2">
                  <strong>Favilla's NY Pizza</strong><br />
                  Email: info@favillaspizzeria.com<br />
                  Phone: (your phone number)
                </p>
              </section>

              <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  By placing an order, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
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
