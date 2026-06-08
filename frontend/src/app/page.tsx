"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Terminal,
  Zap,
  Shield,
  Globe,
  Code2,
  Workflow,
  Cpu,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

const apiSnippet = `curl -X POST ${API_BASE}/api/complaints/create \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"title":"Refund stuck","customerName":"Ada","customerEmail":"ada@example.com"}'`;

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0c0f14] text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0c0f14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40">
              <Terminal className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg">
              Service<span className="text-emerald-400">Flow</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#product" className="hover:text-white transition-colors">
              Product
            </a>
            <a href="#how" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            <Link href="/login" className="hover:text-white transition-colors">
              API console
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-white/10">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-[#0c0f14] font-semibold">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-transparent to-transparent" />
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:items-center lg:py-28 sm:px-6">
            <div className="space-y-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-300">
                <Cpu className="h-3.5 w-3.5" />
                Complaint routing API
              </p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] leading-tight">
                Ship smarter support routing{" "}
                <span className="text-emerald-400">through one REST API</span>
              </h1>
              <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
                Drop ServiceFlow in front of your mobile app, SaaS, or legacy form. We classify
                text with TF‑IDF similarity, score confidence, and assign to the right department or
                agent — tenant-isolated and API-first.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-emerald-500 hover:bg-emerald-400 text-[#0c0f14] font-semibold gap-2"
                  >
                    Create workspace <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10 gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    Sign in to API docs
                  </Button>
                </Link>
              </div>
              <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-zinc-500">
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500/80" /> Tenant-scoped data
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-500/80" /> Bearer API keys
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-emerald-500/80" /> ML-assisted assignment
                </li>
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-white/10 bg-[#080a0d] p-1 shadow-2xl shadow-emerald-950/40 ring-1 ring-white/10">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs text-zinc-500">
                  <span className="h-2 w-2 rounded-full bg-red-500/80" />
                  <span className="h-2 w-2 rounded-full bg-amber-500/80" />
                  <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-zinc-600">your-backend → ServiceFlow</span>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
                  <code>
                    <span className="text-emerald-400">$ </span>
                    <span className="text-zinc-300">{apiSnippet}</span>
                  </code>
                </pre>
                <div className="border-t border-white/10 px-4 py-3 text-xs text-zinc-500 font-mono">
                  → <span className="text-emerald-400">201</span> profile_id · confidence · assignment
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="border-b border-white/10 bg-[#0a0d12] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl mb-14">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for teams who sell an API, not a inbox
              </h2>
              <p className="mt-4 text-zinc-400 text-lg">
                Your customers stay in your UI; ServiceFlow is the routing brain behind{" "}
                <code className="text-emerald-400/90">POST /api/complaints/create</code>.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Code2,
                  title: "REST-first",
                  body: "Cookie-auth dashboard for operators; Bearer keys for every integration. Same tenant, strict isolation.",
                },
                {
                  icon: Workflow,
                  title: "Two routing modes",
                  body: "Department queues or direct agent vectors — controlled per tenant to match how your org works.",
                },
                {
                  icon: Cpu,
                  title: "Similarity routing",
                  body: "Keywords become embeddings; complaints match the best profile with confidence you can monitor.",
                },
              ].map((item) => (
                <Card
                  key={item.title}
                  className="border-white/10 bg-white/[0.03] text-zinc-100 shadow-none"
                >
                  <CardHeader>
                    <item.icon className="h-10 w-10 text-emerald-400/90 mb-2" />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription className="text-zinc-400 leading-relaxed">
                      {item.body}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="py-20 border-b border-white/10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-12">
              Go live in three steps
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Model your teams",
                  desc: "Define departments and agents with keyword profiles in the console — those seed the classifier.",
                },
                {
                  step: "02",
                  title: "Issue API keys",
                  desc: "Rotate Bearer keys per environment. Tune routing strategy under workspace settings.",
                },
                {
                  step: "03",
                  title: "POST complaints",
                  desc: "Your apps send JSON; we return assignment metadata and confidence so you can audit flows.",
                },
              ].map((s) => (
                <div key={s.step} className="relative rounded-2xl border border-white/10 bg-[#0a0d12] p-6">
                  <span className="text-xs font-mono text-emerald-500/90">{s.step}</span>
                  <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 bg-[#0a0d12] border-b border-white/10">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight mb-10">Questions</h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="a1" className="border-white/10 rounded-lg px-4 bg-[#0c0f14]">
                <AccordionTrigger className="text-left hover:no-underline">
                  What do I integrate first?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400 leading-relaxed">
                  Generate an API key, then call{" "}
                  <code className="text-emerald-400/90 text-xs">POST /api/complaints/create</code>{" "}
                  from your server or edge function with the Bearer header. Everything else is
                  operational tooling.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="a2" className="border-white/10 rounded-lg px-4 bg-[#0c0f14]">
                <AccordionTrigger className="text-left hover:no-underline">
                  Is data isolated per customer?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400 leading-relaxed">
                  Yes — tenants are first-class. Keys and rows are scoped so two organizations never
                  see each other&apos;s payloads.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="a3" className="border-white/10 rounded-lg px-4 bg-[#0c0f14]">
                <AccordionTrigger className="text-left hover:no-underline">
                  Do I need this dashboard?
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400 leading-relaxed">
                  Operators use it for structure (people, departments, keys). Your product only needs
                  the HTTP API for intake.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-[#0c0f14] text-zinc-100 overflow-hidden">
              <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 p-8 md:p-10">
                <div>
                  <h2 className="text-2xl font-bold">Ready to route real traffic?</h2>
                  <p className="mt-2 text-zinc-400 max-w-xl">
                    Spin up a tenant, plug in your key, and send your first classified complaint in
                    minutes.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="bg-emerald-500 hover:bg-emerald-400 text-[#0c0f14] font-semibold gap-2"
                    >
                      Get started <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/25 bg-transparent text-white hover:bg-white/10"
                    >
                      Sign in
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10 text-sm text-zinc-500">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 font-medium text-zinc-400">
            <Terminal className="h-4 w-4 text-emerald-500/80" />
            ServiceFlow
          </div>
          <div className="flex flex-wrap gap-6">
            <Link href="/login" className="hover:text-zinc-300">
              Sign in · API docs
            </Link>
            <Link href="/register" className="hover:text-zinc-300">
              Register
            </Link>
            <span className="text-zinc-600">
              Base URL: <code className="text-zinc-500">{API_BASE}/api</code>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
