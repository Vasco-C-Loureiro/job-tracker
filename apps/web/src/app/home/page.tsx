import { createSupabaseServerClient } from "@/lib/supabase.server";
import { Navbar }          from "./_components/Navbar";
import { HeroSection }     from "./_components/HeroSection";
import { ProblemSection }  from "./_components/ProblemSection";
import { FeaturesSection } from "./_components/FeaturesSection";
import { DemoSection }     from "./_components/DemoSection";
import { ReviewsSection }  from "./_components/ReviewsSection";
import { FAQSection }      from "./_components/FAQSection";
import { PricingSection }  from "./_components/PricingSection";
import { Footer }          from "./_components/Footer";

export const metadata = {
  title: "Ascend — Job Application Tracker",
  description:
    "Save any job in one click. Track every application. Never lose track of an opportunity again.",
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <DemoSection />
        <ReviewsSection />
        <FAQSection />
        <PricingSection />
      </main>
      <Footer />
    </>
  );
}
