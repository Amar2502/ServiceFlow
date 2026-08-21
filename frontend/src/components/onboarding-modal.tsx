"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import {
  PlayCircle,
  HelpCircle,
  Building2,
  Users,
  Settings,
  ClipboardList,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

interface StepItem {
  title: string;
  subtitle: string;
  mediaTitle: string;
  mediaIcon: React.ReactNode;
  description: string;
  highlights: string[];
}

const adminSteps: StepItem[] = [
  {
    title: "Step 1: Welcome & Overview",
    subtitle: "Setting up your Tenant Complaint Resolution Hub",
    mediaTitle: "VID_DEMO_01_OVERVIEW.mp4",
    mediaIcon: <Sparkles className="h-10 w-10 text-amber-400 animate-pulse" />,
    description:
      "Welcome to ServiceFlow! As a Tenant Administrator, you control how customer complaints are classified, routed, and resolved across your organization.",
    highlights: [
      "Track live complaint volumes, MTTR, and SLA breaches.",
      "Monitor AI classification accuracy in real time.",
      "Configure automated email notifications for customers.",
    ],
  },
  {
    title: "Step 2: Department vs Employee Routing",
    subtitle: "Selecting your Tenant Ticket Routing Strategy",
    mediaTitle: "VID_DEMO_02_ROUTING_MODE.mp4",
    mediaIcon: <Settings className="h-10 w-10 text-emerald-400 animate-spin-slow" />,
    description:
      "Configure your preferred Ticket Routing Mode in Tenant Settings: DEPARTMENT Mode uses Groq GenAI to route complaints to department queues. EMPLOYEE Mode automatically routes complaints based on employee titles.",
    highlights: [
      "DEPARTMENT Mode: AI zero-shot department routing.",
      "EMPLOYEE Mode: AI title-based employee routing.",
      "Toggle anytime under Dashboard → Tenant Settings.",
    ],
  },
  {
    title: "Step 3: Department Routing",
    subtitle: "Configuring Department Queues",
    mediaTitle: "VID_DEMO_03_KEYWORDS.mp4",
    mediaIcon: <Building2 className="h-10 w-10 text-blue-400" />,
    description:
      "Navigate to Department Routing to create active departments (e.g. Billing, Technical Support, Logistics) so Groq AI routes incoming tickets accurately.",
    highlights: [
      "Create departments like Billing, Support, or Logistics.",
      "Groq AI matches complaint text against department names.",
      "Automatically load-balances assigned staff within departments.",
    ],
  },
  {
    title: "Step 4: Staff Invites & Auto-Mapping",
    subtitle: "Pre-assigning Staff to Departments on Invite",
    mediaTitle: "VID_DEMO_04_SINGLE_INVITES.mp4",
    mediaIcon: <Users className="h-10 w-10 text-purple-400" />,
    description:
      "When inviting support agents under Staff Workload, select their target Department during link generation. When the agent accepts the single-use invite, they are automatically linked to that department and the invite is deleted!",
    highlights: [
      "Single-Use Security: Links are deleted immediately upon redemption.",
      "Admin sets role (ADMIN / AGENT) to prevent privilege escalation.",
      "Auto-connects agent profile to pre-selected department and title.",
    ],
  },
];

const agentSteps: StepItem[] = [
  {
    title: "Step 1: Welcome Support Agent",
    subtitle: "Your Personal Resolution Workspace",
    mediaTitle: "VID_AGENT_01_WORKSPACE.mp4",
    mediaIcon: <Sparkles className="h-10 w-10 text-amber-400" />,
    description:
      "Welcome to ServiceFlow! As a Support Agent, you have access to your personal ticket queue, Groq AI complaint summaries, and 1-click suggested responses.",
    highlights: [
      "View tickets assigned specifically to you.",
      "Track SLA resolution countdown deadlines.",
      "Respond directly to customers with ImageKit file attachments.",
    ],
  },
  {
    title: "Step 2: Personal Assignment Queue",
    subtitle: "Managing your assigned complaints",
    mediaTitle: "VID_AGENT_02_ASSIGNMENTS.mp4",
    mediaIcon: <ClipboardList className="h-10 w-10 text-emerald-400" />,
    description:
      "Access 'My Assignments' from the sidebar to inspect high-priority complaints. View customer contact information, original complaint text, and SLA due times.",
    highlights: [
      "Filter tickets by Priority (URGENT, HIGH, MEDIUM, LOW).",
      "Inspect AI sentiment analysis (FRUSTRATED, NEUTRAL, SATISFIED).",
      "Click ticket titles to view the full resolution timeline.",
    ],
  },
  {
    title: "Step 3: AI Drafts & Internal Notes",
    subtitle: "Collaborating with team members",
    mediaTitle: "VID_AGENT_03_COMPOSER.mp4",
    mediaIcon: <HelpCircle className="h-10 w-10 text-sky-400" />,
    description:
      "Use Groq GenAI 1-click suggested replies to insert pre-written draft responses into the composer. Toggle the amber 'Internal Note' switch to post private notes to team members.",
    highlights: [
      "1-Click Insert AI Suggested Reply into response composer.",
      "Post Amber Internal Notes visible only to support staff.",
      "Submit classification accuracy feedback to train AI.",
    ],
  },
];

export function OnboardingModal({ forceOpen = false, onClose = () => {} }: { forceOpen?: boolean; onClose?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = user?.role === "ADMIN" ? adminSteps : agentSteps;
  const storageKey = user ? `serviceflow_onboarding_seen_${user.userId}` : null;

  useEffect(() => {
    if (forceOpen) {
      setCurrentStep(0);
      setOpen(true);
      return;
    }

    if (storageKey) {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        setOpen(true);
      }
    }
  }, [forceOpen, storageKey]);

  const handleDismiss = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    setOpen(false);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  if (!user || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleDismiss(); }}>
      <DialogContent className="max-w-2xl bg-[#2a2a2a] text-white border-zinc-700 p-6 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-400 font-mono font-semibold uppercase tracking-wider">
            <span>ServiceFlow Interactive Guide</span>
            <span>Step {currentStep + 1} of {steps.length}</span>
          </div>
          <DialogTitle className="text-xl font-bold text-white">
            {step.title}
          </DialogTitle>
          <p className="text-xs text-zinc-400">{step.subtitle}</p>
        </DialogHeader>

        <div className="w-full bg-[#1e1e1e] border-2 border-zinc-700 rounded-lg h-48 flex flex-col items-center justify-center p-4 relative overflow-hidden my-2 group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/10 pointer-events-none" />
          
          <div className="flex items-center justify-center mb-3 bg-zinc-800/80 p-4 rounded-full border border-zinc-600 shadow-inner">
            {step.mediaIcon}
          </div>
          
          <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-zinc-700 text-xs font-mono text-zinc-300">
            <PlayCircle className="h-4 w-4 text-amber-400" />
            <span>{step.mediaTitle}</span>
          </div>
        </div>

        <div className="bg-[#1e1e1e] border border-zinc-700 rounded-lg p-4 space-y-3">
          <p className="text-sm text-zinc-200 leading-relaxed font-sans">
            {step.description}
          </p>

          <div className="space-y-1.5 pt-1">
            {step.highlights.map((item, idx) => (
              <div key={idx} className="flex items-start text-xs text-zinc-300 gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep ? "w-6 bg-amber-400" : "w-2 bg-zinc-700"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="bg-red-950/40 text-red-300 border-red-800/60 hover:bg-red-900/60 hover:text-white text-xs font-semibold px-4"
            >
              I KNOW
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5"
            >
              <span>{currentStep === steps.length - 1 ? "Finish Tour" : "Next"}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
