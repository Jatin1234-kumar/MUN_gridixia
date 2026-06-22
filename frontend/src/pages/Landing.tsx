import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe2,
  Landmark,
  LayoutDashboard,
  Lock,
  QrCode,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
  Zap,
} from 'lucide-react';
import { useSeo } from '@/lib/seo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5 },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-navy-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold-500/30 bg-gold-500/10">
            <Globe2 size={18} className="text-gold-400" />
          </div>
          <span className="font-display text-lg font-semibold text-foreground">MUN Gridixia</span>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
          <a
            href="#testimonials"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Testimonials
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Sign In
          </Button>
          <Button
            size="sm"
            className="bg-gold-500 text-navy-950 hover:bg-gold-400"
            onClick={() => navigate('/register')}
          >
            Get Started
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] bg-radial-gold" />
      <div className="pointer-events-none absolute left-1/2 top-32 -z-10 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-gold-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 text-center">
        <motion.div {...fadeUp}>
          <Badge
            variant="outline"
            className="mb-6 border-gold-500/30 bg-gold-500/10 text-gold-400 font-mono text-[10px] uppercase tracking-[0.3em]"
          >
            Conference Operations Platform
          </Badge>
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl lg:text-7xl"
        >
          Run MUN Events
          <br />
          <span className="bg-gradient-to-r from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent">
            Like a Command Center
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed"
        >
          Premium conference operations platform for Model United Nations and Youth Parliament
          events. From registration to certification — manage every delegate milestone in real-time.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="bg-gold-500 text-navy-950 hover:bg-gold-400 h-12 px-8 text-sm font-semibold"
            onClick={() => navigate('/register')}
          >
            Start Free Trial
            <ArrowRight size={16} />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 text-sm"
            onClick={() => navigate('/login')}
          >
            View Dashboard Demo
          </Button>
        </motion.div>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-6 text-center"
        >
          {[
            { value: '10K+', label: 'Delegates Managed' },
            { value: '250+', label: 'Conferences Hosted' },
            { value: '99.9%', label: 'Platform Uptime' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-gold-400">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground font-mono uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: LayoutDashboard,
      title: 'Command Center',
      description:
        'Real-time dashboards with live metrics, delegate status tracking, and operational monitoring for organizers.',
    },
    {
      icon: Users,
      title: 'Delegate Management',
      description:
        'Complete delegate lifecycle — registration, application review, profile management, and country allocation.',
    },
    {
      icon: Landmark,
      title: 'Committee Engine',
      description:
        'Create committees, set agendas, manage capacities, and automate country-to-delegate allocation.',
    },
    {
      icon: CreditCard,
      title: 'Payment Processing',
      description:
        'Secure payment sessions with order tracking, receipt generation, and status monitoring.',
    },
    {
      icon: QrCode,
      title: 'Check-In Scanner',
      description:
        'QR-code based check-in for seamless event attendance tracking and verification.',
    },
    {
      icon: Award,
      title: 'Certificate Vault',
      description:
        'Automated certificate issuance after attendance verification — delegates download their achievements.',
    },
    {
      icon: CalendarDays,
      title: 'Event Management',
      description:
        'Create and manage conferences with date tracking, venue details, and operational status.',
    },
    {
      icon: BarChart3,
      title: 'Reports & Analytics',
      description:
        'Generate operational reports, export data, and monitor conference performance metrics.',
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description:
        'Granular permissions for super admins, organizers, and delegates with secure JWT authentication.',
    },
  ];

  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div {...fadeUp} className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-gold-500/20 bg-gold-500/5 text-gold-400 font-mono text-[10px] uppercase tracking-[0.3em]"
          >
            Platform Capabilities
          </Badge>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Everything You Need to Run
            <br />
            <span className="text-gold-400">World-Class MUN Events</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            A unified operations platform that replaces spreadsheets, email threads, and manual
            workflows with a single command center.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...stagger}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className="glass-card gold-border group rounded-2xl p-6 transition-all duration-300 hover:shadow-card-hover"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10 text-gold-400 transition-transform duration-300 group-hover:scale-110">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: '01',
      icon: FileText,
      title: 'Delegate Registers',
      description:
        'Delegates sign up and complete their application with personal details, committee preferences, and country choices.',
    },
    {
      step: '02',
      icon: CreditCard,
      title: 'Secure Payment',
      description:
        'Delegate completes conference fee payment through the integrated secure payment gateway.',
    },
    {
      step: '03',
      icon: Landmark,
      title: 'Committee Allocation',
      description:
        'Organizers assign delegates to committees and countries through the command center dashboard.',
    },
    {
      step: '04',
      icon: Ticket,
      title: 'Check-In & Attend',
      description:
        'Delegates scan their QR passes at the venue for instant attendance verification.',
    },
    {
      step: '05',
      icon: Award,
      title: 'Receive Certificate',
      description:
        'After attendance verification, certificates are automatically issued and available for download.',
    },
  ];

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div {...fadeUp} className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-gold-500/20 bg-gold-500/5 text-gold-400 font-mono text-[10px] uppercase tracking-[0.3em]"
          >
            Delegate Journey
          </Badge>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            From Registration to Certification
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            A streamlined five-step journey for every delegate, managed end-to-end by your command
            center.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              {...stagger}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="relative text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-500/20 bg-gold-500/10">
                <step.icon className="h-6 w-6 text-gold-400" />
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-gold-500">
                {step.step}
              </p>
              <h3 className="mt-2 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
              {i < steps.length - 1 && (
                <div className="pointer-events-none absolute left-[calc(50%+32px)] top-8 hidden h-px w-[calc(100%-64px)] bg-gold-500/20 lg:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      period: 'for small events',
      description: 'Perfect for single-committee conferences with up to 50 delegates.',
      features: [
        '1 event',
        '1 committee',
        'Up to 50 delegates',
        'Basic registration flow',
        'QR check-in',
        'Certificate issuance',
        'Email support',
      ],
      cta: 'Get Started Free',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '$49',
      period: 'per event',
      description: 'For multi-committee conferences with full operations control.',
      features: [
        'Up to 5 events',
        'Unlimited committees',
        'Up to 500 delegates',
        'Payment processing',
        'Country allocation engine',
        'Reports & analytics',
        'Role-based access',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'for organizations',
      description: 'For conference organizations running multiple annual events.',
      features: [
        'Unlimited events',
        'Unlimited delegates',
        'Custom branding',
        'API access',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise deployment',
        'Training & onboarding',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
      <div className="mx-auto max-w-7xl px-6">
        <motion.div {...fadeUp} className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-gold-500/20 bg-gold-500/5 text-gold-400 font-mono text-[10px] uppercase tracking-[0.3em]"
          >
            Pricing
          </Badge>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start free and scale as your conferences grow. No hidden fees.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              {...stagger}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className={`glass-card rounded-2xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? 'gold-border shadow-gold-glow relative'
                  : 'border border-white/[0.08]'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gold-500 text-navy-950 font-mono text-[10px] uppercase tracking-widest">
                    Most Popular
                  </Badge>
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <CheckCircle2 size={14} className="shrink-0 text-gold-400" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              <Button
                className={`mt-8 w-full h-10 ${
                  plan.highlighted
                    ? 'bg-gold-500 text-navy-950 hover:bg-gold-400'
                    : 'variant-outline'
                }`}
                variant={plan.highlighted ? 'default' : 'outline'}
                onClick={() => navigate('/register')}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      quote:
        'MUN Gridixia transformed how we run our annual conference. The command center gives us real-time visibility into every delegate milestone.',
      name: 'Sarah Chen',
      role: 'Secretary-General, HNMUN Asia-Pacific',
      initials: 'SC',
    },
    {
      quote:
        'From registration to certificate issuance, the entire workflow is automated. We cut admin time by 60% in our first event.',
      name: 'Marcus Okafor',
      role: 'Director, Lagos Model UN',
      initials: 'MO',
    },
    {
      quote:
        'The country allocation engine is brilliant. What used to take hours of manual spreadsheet work now happens in minutes.',
      name: 'Priya Sharma',
      role: 'Head Organizer, Delhi Youth Parliament',
      initials: 'PS',
    },
  ];

  return (
    <section id="testimonials" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div {...fadeUp} className="text-center">
          <Badge
            variant="outline"
            className="mb-4 border-gold-500/20 bg-gold-500/5 text-gold-400 font-mono text-[10px] uppercase tracking-[0.3em]"
          >
            Testimonials
          </Badge>
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Trusted by Conference Organizers
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              {...stagger}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6 border border-white/[0.08]"
            >
              <div className="flex gap-1 text-gold-400">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={14} fill="currentColor" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-500/20 bg-gold-500/10 text-xs font-semibold text-gold-400">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Security() {
  const items = [
    {
      icon: Lock,
      title: 'JWT Authentication',
      description: 'Secure token-based auth with httpOnly refresh tokens',
    },
    {
      icon: ShieldCheck,
      title: 'Role-Based Access',
      description: 'Granular permissions for admin, organizer, and delegate roles',
    },
    {
      icon: Zap,
      title: 'Encrypted Payments',
      description: 'PCI-compliant payment processing with end-to-end encryption',
    },
    {
      icon: Sparkles,
      title: 'Real-Time Sync',
      description: 'Live data updates across all connected sessions',
    },
  ];

  return (
    <section className="relative py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
      <div className="mx-auto max-w-7xl px-6">
        <div className="glass-card gold-border rounded-2xl p-8 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <motion.div {...fadeUp}>
              <Badge
                variant="outline"
                className="mb-4 border-gold-500/20 bg-gold-500/5 text-gold-400 font-mono text-[10px] uppercase tracking-[0.3em]"
              >
                Security & Infrastructure
              </Badge>
              <h2 className="font-display text-3xl font-bold text-foreground">
                Enterprise-Grade Security
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Your conference data is protected by industry-standard security practices. From
                authentication to payment processing, every layer is hardened.
              </p>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...stagger}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold-500/20 bg-gold-500/10">
                    <item.icon size={16} className="text-gold-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          {...fadeUp}
          className="glass-card gold-border rounded-2xl px-8 py-16 text-center sm:px-16"
        >
          <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Ready to Elevate Your Next Conference?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join hundreds of conference organizers who trust MUN Gridixia to manage their events.
            Start free — no credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-gold-500 text-navy-950 hover:bg-gold-400 h-12 px-8 text-sm font-semibold"
              onClick={() => navigate('/register')}
            >
              Create Your Account
              <ArrowRight size={16} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-sm"
              onClick={() => navigate('/login')}
            >
              Sign In to Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold-500/30 bg-gold-500/10">
              <Globe2 size={14} className="text-gold-400" />
            </div>
            <span className="font-display text-sm font-semibold text-foreground">MUN Gridixia</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Testimonials
            </a>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            &copy; {new Date().getFullYear()} MUN Gridixia. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  useSeo({
    title: 'MUN Gridixia — Premium Conference Operations Platform',
    description:
      'Run Model United Nations and Youth Parliament events with a command center. Delegate registration, payment processing, committee allocation, check-in, and certification — all in one platform.',
    url: 'https://gridixia.org',
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <Security />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
