import { LandingNav } from './components/LandingNav'
import { HeroSection } from './components/HeroSection'
import { ProvidersSection } from './components/ProvidersSection'
import { FeaturesSection } from './components/FeaturesSection'
import { HowItWorksSection } from './components/HowItWorksSection'
import { PricingSection } from './components/PricingSection'
import { CtaSection } from './components/CtaSection'
import { LandingFooter } from './components/LandingFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <HeroSection />
      <ProvidersSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <CtaSection />
      <LandingFooter />
    </div>
  )
}
