import type { Profile } from "@/lib/types";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: "creator@boardroom.app",
  user_metadata: {
    full_name: "Aanya Sharma",
    name: "Aanya Sharma",
  },
};

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER_ID,
  full_name: "Aanya Sharma",
  business_name: "Aanya Studios",
  email: "creator@boardroom.app",
  phone: "+91 98765 43210",
  currency: "INR",
  onboarding_completed: true,
  created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
};
