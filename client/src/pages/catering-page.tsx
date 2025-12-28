import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  Utensils,
  Phone,
  Mail,
  Check,
  Star,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Footer from "@/components/layout/footer";

interface CateringFormData {
  eventType: string;
  customEventType?: string;
  serviceType: string;
  eventAddress?: string;
  eventDate?: string;
  eventTime?: string;
  specialDeliveryInstructions?: string;
  guestCount: string;
  customGuestCount?: number;
  viewPackages: string;
  selectedPackage?: string;
  menuStyle: string;
  dietaryRestrictions: string[];
  budgetRange: string;
  additionalServices: string[];
  specialRequests: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  preferredContact: string;
  bestTimeToCall: string;
}

const CateringPage = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<CateringFormData>({
    eventType: "",
    serviceType: "",
    guestCount: "",
    viewPackages: "",
    menuStyle: "",
    dietaryRestrictions: [],
    budgetRange: "",
    additionalServices: [],
    specialRequests: "",
    fullName: "",
    phoneNumber: "",
    email: "",
    preferredContact: "",
    bestTimeToCall: "",
  });

  const totalSteps = 6;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const eventTypeOptions = [
    { id: "corporate", label: "Corporate Meeting/Lunch", icon: "💼" },
    { id: "wedding", label: "Wedding Reception", icon: "💒" },
    { id: "birthday", label: "Birthday Celebration", icon: "🎂" },
    { id: "family", label: "Family Reunion", icon: "👨‍👩‍👧‍👦" },
    { id: "holiday", label: "Holiday Party", icon: "🎄" },
    { id: "graduation", label: "Graduation Event", icon: "🎓" },
    { id: "memorial", label: "Memorial Service", icon: "🕊️" },
    { id: "community", label: "Community Gathering", icon: "🏘️" },
    { id: "other", label: "Other", icon: "📝" },
  ];

  const guestCountOptions = [
    { id: "10-25", label: "10-25 people" },
    { id: "26-50", label: "26-50 people" },
    { id: "51-100", label: "51-100 people" },
    { id: "101-200", label: "101-200 people" },
    { id: "200+", label: "200+ people" },
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/catering-inquiry", formData);
      setIsSubmitted(true);
      toast({
        title: "Inquiry Submitted!",
        description: "We'll contact you within 24 hours to discuss your catering needs.",
      });
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Please try again or call us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof CateringFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-advance for single-card selection pages
    if (field === 'eventType' && currentStep === 1 && value !== 'other') {
      // Auto-advance after short delay for better UX
      setTimeout(() => {
        setCurrentStep(2);
      }, 500);
    } else if (field === 'guestCount' && currentStep === 3 && value !== '200+') {
      // Auto-advance after short delay for better UX
      setTimeout(() => {
        setCurrentStep(4);
      }, 500);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <Helmet>
          <title>Catering Inquiry Submitted | Favilla's NY Pizza</title>
        </Helmet>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Thank You!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-6">
                Your catering inquiry has been submitted. Our catering specialist will contact you within 24 hours to discuss your event details and provide a custom quote.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• We'll call you at {formData.phoneNumber}</p>
                <p>• Confirmation email sent to {formData.email}</p>
                <p>• Reference ID: CT-{Date.now()}</p>
              </div>
              <Button
                onClick={() => window.location.href = '/'}
                className="mt-6 w-full bg-[#d73a31] hover:bg-[#c73128]"
              >
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Catering Services | Favilla's NY Pizza</title>
        <meta name="description" content="Let Favilla's cater your next event! Corporate meetings, weddings, parties and more. Get a custom quote today." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8 pt-24 md:pt-20">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Catering Services</h1>
              <p className="text-xl text-gray-600">Let us make your next event delicious!</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                Please submit catering orders at least 24 hours in advance
              </div>
            </div>

            {/* Progress Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</span>
                <span className="text-sm text-gray-600">{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">

            {/* Card 1: Event Type Selection */}
            {currentStep === 1 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-2xl text-gray-900 flex items-center justify-center gap-2">
                    <Utensils className="w-6 h-6 text-[#d73a31]" />
                    What type of event are you planning?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {eventTypeOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => updateFormData('eventType', option.id)}
                        className={`p-6 rounded-lg border-2 transition-all hover:shadow-md ${
                          formData.eventType === option.id
                            ? 'border-[#d73a31] bg-red-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-3">{option.icon}</div>
                          <div className="font-medium text-gray-900">{option.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {formData.eventType === 'other' && (
                    <div className="mt-6">
                      <Label htmlFor="customEventType">Please specify your event type:</Label>
                      <Input
                        id="customEventType"
                        value={formData.customEventType || ''}
                        onChange={(e) => updateFormData('customEventType', e.target.value)}
                        placeholder="Enter your event type..."
                        className="mt-2"
                      />
                    </div>
                  )}

                  <div className="flex justify-end mt-8">
                    <Button
                      onClick={handleNext}
                      disabled={!formData.eventType}
                      className="px-8 bg-[#d73a31] hover:bg-[#c73128]"
                    >
                      Next <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card 2: Service Type */}
            {currentStep === 2 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-2xl text-gray-900 flex items-center justify-center gap-2">
                    <MapPin className="w-6 h-6 text-[#d73a31]" />
                    How would you like your catering delivered?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => updateFormData('serviceType', 'pickup')}
                      className={`p-6 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                        formData.serviceType === 'pickup'
                          ? 'border-[#d73a31] bg-red-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center md:text-left">
                        <div className="text-4xl mb-3">🚗</div>
                        <h3 className="font-semibold text-lg mb-2">Pickup Catering</h3>
                        <p className="text-gray-600">I'll collect the order from your location</p>
                      </div>
                    </button>

                    <button
                      onClick={() => updateFormData('serviceType', 'delivery')}
                      className={`p-6 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                        formData.serviceType === 'delivery'
                          ? 'border-[#d73a31] bg-red-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center md:text-left">
                        <div className="text-4xl mb-3">🚚</div>
                        <h3 className="font-semibold text-lg mb-2">Delivery & Setup</h3>
                        <p className="text-gray-600">Deliver and set up at my event location</p>
                      </div>
                    </button>
                  </div>

                  {formData.serviceType === 'delivery' && (
                    <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-4">Delivery Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="eventAddress">Event Address *</Label>
                          <Textarea
                            id="eventAddress"
                            value={formData.eventAddress || ''}
                            onChange={(e) => updateFormData('eventAddress', e.target.value)}
                            placeholder="Full event address..."
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="eventDate">Event Date *</Label>
                            <Input
                              id="eventDate"
                              type="date"
                              value={formData.eventDate || ''}
                              onChange={(e) => updateFormData('eventDate', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="eventTime">Event Time *</Label>
                            <Input
                              id="eventTime"
                              type="time"
                              value={formData.eventTime || ''}
                              onChange={(e) => updateFormData('eventTime', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label htmlFor="deliveryInstructions">Special Delivery Instructions</Label>
                        <Textarea
                          id="deliveryInstructions"
                          value={formData.specialDeliveryInstructions || ''}
                          onChange={(e) => updateFormData('specialDeliveryInstructions', e.target.value)}
                          placeholder="Parking instructions, access codes, setup preferences..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={handleBack}>
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!formData.serviceType || (formData.serviceType === 'delivery' && (!formData.eventAddress || !formData.eventDate || !formData.eventTime))}
                      className="px-8 bg-[#d73a31] hover:bg-[#c73128]"
                    >
                      Next <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card 3: Guest Count */}
            {currentStep === 3 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-2xl text-gray-900 flex items-center justify-center gap-2">
                    <Users className="w-6 h-6 text-[#d73a31]" />
                    How many people will you be serving?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {guestCountOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => updateFormData('guestCount', option.id)}
                        className={`p-6 rounded-lg border-2 transition-all hover:shadow-md ${
                          formData.guestCount === option.id
                            ? 'border-[#d73a31] bg-red-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center">
                          <Users className="w-8 h-8 mx-auto mb-3 text-[#d73a31]" />
                          <div className="font-medium text-gray-900">{option.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {formData.guestCount === '200+' && (
                    <div className="mt-6">
                      <Label htmlFor="customGuestCount">Please specify the number of guests:</Label>
                      <Input
                        id="customGuestCount"
                        type="number"
                        value={formData.customGuestCount || ''}
                        onChange={(e) => updateFormData('customGuestCount', parseInt(e.target.value))}
                        placeholder="Enter number of guests..."
                        className="mt-2"
                        min="201"
                      />
                    </div>
                  )}

                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={handleBack}>
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!formData.guestCount}
                      className="px-8 bg-[#d73a31] hover:bg-[#c73128]"
                    >
                      Next <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card 4: View Packages */}
            {currentStep === 4 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-2xl text-gray-900 flex items-center justify-center gap-2">
                    <Package className="w-6 h-6 text-[#d73a31]" />
                    Would you like to view our catering packages?
                  </CardTitle>
                  <p className="text-center text-gray-600 mt-2">
                    Based on serving {formData.guestCount === '200+' ? `${formData.customGuestCount || '200+'}` : formData.guestCount} people
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => updateFormData('viewPackages', 'yes')}
                      className={`p-6 rounded-lg border-2 transition-all hover:shadow-md ${
                        formData.viewPackages === 'yes'
                          ? 'border-[#d73a31] bg-red-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-3">📦</div>
                        <h3 className="font-semibold text-lg mb-2">Yes, show me packages</h3>
                        <p className="text-gray-600 text-sm">View our pre-designed catering packages with recommended items for your group size</p>
                      </div>
                    </button>

                    <button
                      onClick={() => updateFormData('viewPackages', 'no')}
                      className={`p-6 rounded-lg border-2 transition-all hover:shadow-md ${
                        formData.viewPackages === 'no'
                          ? 'border-[#d73a31] bg-red-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-3">✏️</div>
                        <h3 className="font-semibold text-lg mb-2">No, I'll customize my order</h3>
                        <p className="text-gray-600 text-sm">Skip packages and tell us exactly what you need</p>
                      </div>
                    </button>
                  </div>

                  {formData.viewPackages === 'yes' && (
                    <div className="mt-8">
                      <h4 className="font-semibold text-lg mb-4 text-center">Select a Package</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                          onClick={() => updateFormData('selectedPackage', 'basic')}
                          className={`p-5 rounded-lg border-2 transition-all hover:shadow-md ${
                            formData.selectedPackage === 'basic'
                              ? 'border-[#d73a31] bg-red-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <Badge className="bg-gray-500 mb-2">Basic</Badge>
                            <h3 className="font-semibold mb-1">Pizza Party</h3>
                            <p className="text-gray-600 text-xs">Pizzas, salad & drinks</p>
                          </div>
                        </button>

                        <button
                          onClick={() => updateFormData('selectedPackage', 'standard')}
                          className={`p-5 rounded-lg border-2 transition-all hover:shadow-md ${
                            formData.selectedPackage === 'standard'
                              ? 'border-[#d73a31] bg-red-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <Badge className="bg-blue-500 mb-2">Popular</Badge>
                            <h3 className="font-semibold mb-1">Italian Feast</h3>
                            <p className="text-gray-600 text-xs">Pizzas, appetizers, salads & dessert</p>
                          </div>
                        </button>

                        <button
                          onClick={() => updateFormData('selectedPackage', 'premium')}
                          className={`p-5 rounded-lg border-2 transition-all hover:shadow-md ${
                            formData.selectedPackage === 'premium'
                              ? 'border-[#d73a31] bg-red-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-center">
                            <Badge className="bg-yellow-500 mb-2">Premium</Badge>
                            <h3 className="font-semibold mb-1">Full Service</h3>
                            <p className="text-gray-600 text-xs">Complete catering with all the extras</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={handleBack}>
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!formData.viewPackages || (formData.viewPackages === 'yes' && !formData.selectedPackage)}
                      className="px-8 bg-[#d73a31] hover:bg-[#c73128]"
                    >
                      Next <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card 5: Additional Details */}
            {currentStep === 5 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-2xl text-gray-900 flex items-center justify-center gap-2">
                    <Star className="w-6 h-6 text-[#d73a31]" />
                    Tell us more about your catering needs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Menu Style */}
                  <div>
                    <Label htmlFor="menuStyle">Preferred Menu Style *</Label>
                    <Select value={formData.menuStyle} onValueChange={(value) => updateFormData('menuStyle', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select menu style..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buffet">Buffet Style</SelectItem>
                        <SelectItem value="plated">Plated Meals</SelectItem>
                        <SelectItem value="appetizers">Appetizers Only</SelectItem>
                        <SelectItem value="family-style">Family Style</SelectItem>
                        <SelectItem value="full-service">Full Service</SelectItem>
                        <SelectItem value="custom">Custom Menu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dietary Restrictions */}
                  <div>
                    <Label>Dietary Restrictions/Allergies</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['Vegetarian', 'Vegan', 'Gluten-free', 'Nut allergies', 'Dairy-free', 'Kosher'].map((restriction) => (
                        <div key={restriction} className="flex items-center space-x-2">
                          <Checkbox
                            id={restriction}
                            checked={formData.dietaryRestrictions.includes(restriction)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFormData('dietaryRestrictions', [...formData.dietaryRestrictions, restriction]);
                              } else {
                                updateFormData('dietaryRestrictions', formData.dietaryRestrictions.filter(r => r !== restriction));
                              }
                            }}
                          />
                          <Label htmlFor={restriction} className="text-sm">{restriction}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div>
                    <Label htmlFor="budgetRange">Budget Range</Label>
                    <Select value={formData.budgetRange} onValueChange={(value) => updateFormData('budgetRange', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select budget range..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-500">Under $500</SelectItem>
                        <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                        <SelectItem value="1000-2500">$1,000 - $2,500</SelectItem>
                        <SelectItem value="2500-5000">$2,500 - $5,000</SelectItem>
                        <SelectItem value="over-5000">Over $5,000</SelectItem>
                        <SelectItem value="flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Additional Services */}
                  <div>
                    <Label>Additional Services Needed</Label>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {['Tables & chairs', 'Linens', 'Serving staff', 'Cleanup service', 'Decorations', 'Bar service'].map((service) => (
                        <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                            id={service}
                            checked={formData.additionalServices.includes(service)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateFormData('additionalServices', [...formData.additionalServices, service]);
                              } else {
                                updateFormData('additionalServices', formData.additionalServices.filter(s => s !== service));
                              }
                            }}
                          />
                          <Label htmlFor={service} className="text-sm">{service}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div>
                    <Label htmlFor="specialRequests">Special Requests</Label>
                    <Textarea
                      id="specialRequests"
                      value={formData.specialRequests}
                      onChange={(e) => updateFormData('specialRequests', e.target.value)}
                      placeholder="Any special menu items, themes, or other requirements..."
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={handleBack}>
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!formData.menuStyle}
                      className="px-8 bg-[#d73a31] hover:bg-[#c73128]"
                    >
                      Next <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card 6: Contact Information */}
            {currentStep === 6 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-2xl text-gray-900 flex items-center justify-center gap-2">
                    <Phone className="w-6 h-6 text-[#d73a31]" />
                    How can we reach you about your catering inquiry?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => updateFormData('fullName', e.target.value)}
                        placeholder="Your full name..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number *</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                        placeholder="(555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        placeholder="your@email.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="preferredContact">Preferred Contact Method</Label>
                      <Select value={formData.preferredContact} onValueChange={(value) => updateFormData('preferredContact', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select preference..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Phone Call</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="text">Text Message</SelectItem>
                          <SelectItem value="any">Any Method</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bestTimeToCall">Best Time to Call</Label>
                    <Select value={formData.bestTimeToCall} onValueChange={(value) => updateFormData('bestTimeToCall', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select best time..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (9AM - 12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                        <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                        <SelectItem value="anytime">Anytime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Summary */}
                  <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-4">Order Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Event Type:</strong> {formData.eventType === 'other' ? formData.customEventType : eventTypeOptions.find(o => o.id === formData.eventType)?.label}
                      </div>
                      <div>
                        <strong>Service:</strong> {formData.serviceType === 'pickup' ? 'Pickup' : 'Delivery & Setup'}
                      </div>
                      <div>
                        <strong>Guests:</strong> {formData.guestCount === '200+' ? `${formData.customGuestCount} people` : guestCountOptions.find(o => o.id === formData.guestCount)?.label}
                      </div>
                      <div>
                        <strong>Menu Style:</strong> {formData.menuStyle}
                      </div>
                      {formData.selectedPackage && (
                        <div>
                          <strong>Package:</strong> {formData.selectedPackage === 'basic' ? 'Pizza Party' : formData.selectedPackage === 'standard' ? 'Italian Feast' : 'Full Service'}
                        </div>
                      )}
                      {formData.eventDate && (
                        <div>
                          <strong>Event Date:</strong> {new Date(formData.eventDate).toLocaleDateString()}
                        </div>
                      )}
                      {formData.eventTime && (
                        <div>
                          <strong>Event Time:</strong> {formData.eventTime}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-900">What happens next?</h4>
                        <p className="text-blue-800 text-sm mt-1">
                          Our catering specialist will contact you within 24 hours to discuss menu options, finalize details, and provide a custom quote for your event.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-8">
                    <Button variant="outline" onClick={handleBack}>
                      <ChevronLeft className="mr-2 w-4 h-4" /> Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!formData.fullName || !formData.phoneNumber || !formData.email || isSubmitting}
                      className="px-8 bg-[#d73a31] hover:bg-[#c73128]"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
};

export default CateringPage;