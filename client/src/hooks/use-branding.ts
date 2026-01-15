import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface BrandingSettings {
  COMPANY_NAME: string;
  COMPANY_TAGLINE: string;
  COMPANY_ADDRESS: string;
  COMPANY_PHONE: string;
  COMPANY_EMAIL: string;
  COMPANY_WEBSITE: string;
  LOGO_URL: string;
  FAVICON_URL: string;
}

const defaultBranding: BrandingSettings = {
  COMPANY_NAME: "FAVILLA'S NY PIZZA",
  COMPANY_TAGLINE: "Authentic New York Style Pizza",
  COMPANY_ADDRESS: "123 Main St, Asheville, NC",
  COMPANY_PHONE: "(828) 555-0123",
  COMPANY_EMAIL: "info@favillaspizza.com",
  COMPANY_WEBSITE: "https://favillaspizza.com",
  LOGO_URL: "/images/logopng.png",
  FAVICON_URL: "/favicon.ico"
};

export function useBranding() {
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/admin/system-settings', 'branding'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/system-settings?category=branding');
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Convert array of settings to object with setting keys
  const branding: BrandingSettings = { ...defaultBranding };
  
  if (settingsData?.branding) {
    settingsData.branding.forEach((setting: any) => {
      if (setting.setting_key && setting.setting_value) {
        branding[setting.setting_key as keyof BrandingSettings] = setting.setting_value;
      }
    });
  }

  return {
    branding,
    isLoading,
    // Convenience getters
    companyName: branding.COMPANY_NAME,
    companyTagline: branding.COMPANY_TAGLINE,
    companyAddress: branding.COMPANY_ADDRESS,
    companyPhone: branding.COMPANY_PHONE,
    companyEmail: branding.COMPANY_EMAIL,
    companyWebsite: branding.COMPANY_WEBSITE,
    logoUrl: branding.LOGO_URL,
    faviconUrl: branding.FAVICON_URL,
  };
}