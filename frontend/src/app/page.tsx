"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChevronRight,
  ClipboardCheck,
  BarChart2,
  MessageCircle,
  Users,
  Briefcase,
  Zap,
  ShieldCheck,
  TrendingUp,
  Star,
  Award,
  Shield,
  Database,
  Code,
  Lock,
  Cloud,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex items-center justify-between h-16 px-4 mx-auto sm:px-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-[#EED9C4] flex items-center justify-center">
              <ClipboardCheck size={20} className="text-neutral-800" />
            </div>
            <span className="text-xl font-bold">ServiceFlow</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/register">
            <Button
              variant="ghost"
              size="default"
              className="bg-[#EED9C4] text-neutral-900 hover:bg-[#E6C8B4] cursor-pointer"
            >
              Register
            </Button>
            </Link>
            <Link href="/login">
            <Button
              variant="ghost"
              size="default"
              className="bg-[#EED9C4] text-neutral-900 hover:bg-[#E6C8B4] cursor-pointer"
            >
              Log in
            </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-linear-to-b from-white to-[#F9F2EB]">
        <div className="container px-4 mx-auto sm:px-6">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="flex-1 space-y-6 text-center lg:text-left">
              <div className="inline-block px-4 py-1 rounded-full bg-[#EED9C4] text-sm font-medium text-neutral-900 mb-4">
                AI-Powered • Multi-Tenant • API-First
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                AI-Powered Complaint Management with Intelligent Routing
              </h1>
              <p className="max-w-2xl mx-auto lg:mx-0 text-lg text-neutral-600">
                ServiceFlow is a multi-tenant, API-first platform with ML-powered routing that automatically assigns complaints to the right departments or employees using TF-IDF vectorization and cosine similarity matching.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="bg-[#EED9C4] text-neutral-900 hover:bg-[#E6C8B4] cursor-pointer"
                >
                  Get API Access
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline">
                  View Documentation
                </Button>
              </div>
              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>SOC 2 Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Tenant Isolation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>REST APIs</span>
                </div>
              </div>
            </div>
            <div className="flex-1 mt-10 lg:mt-0 lg:ml-10">
              <div className="relative mx-auto w-full max-w-md rounded-xl shadow-xl overflow-hidden">
                <div className="bg-neutral-900 p-4 rounded-xl">
                  <div className="bg-neutral-800 rounded-lg p-4 font-mono text-sm">
                    <div className="text-green-400">POST /api/complaints/assign-to-assignee-through-ml</div>
                    <div className="text-neutral-400 mt-2">{"{"}</div>
                    <div className="ml-4 text-blue-300">"complaintId": "uuid",</div>
                    <div className="ml-4 text-blue-300">"complaintText": "Order delayed..."</div>
                    <div className="text-neutral-400">{"}"}</div>
                    <div className="mt-4 text-yellow-400">→ 200 OK</div>
                    <div className="text-neutral-400 mt-2">{"{"}</div>
                    <div className="ml-4 text-purple-300">"assignee_type": "DEPARTMENT",</div>
                    <div className="ml-4 text-purple-300">"department_name": "Shipping",</div>
                    <div className="ml-4 text-purple-300">"confidence": 0.92,</div>
                    <div className="ml-4 text-emerald-300">"needs_review": false</div>
                    <div className="text-neutral-400">{"}"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#EED9C4] flex items-center justify-center mx-auto mb-4">
                <Cloud className="h-8 w-8 text-neutral-800" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Multi-Tenant SaaS</h3>
              <p className="text-sm text-neutral-600">Complete data isolation per organization with tenant-scoped APIs</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#EED9C4] flex items-center justify-center mx-auto mb-4">
                <Code className="h-8 w-8 text-neutral-800" />
              </div>
              <h3 className="font-semibold text-lg mb-2">API-First Design</h3>
              <p className="text-sm text-neutral-600">Integrate with web, mobile, and third-party systems via REST APIs</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#EED9C4] flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-neutral-800" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Enterprise Security</h3>
              <p className="text-sm text-neutral-600">Role-based access control with secure API key authentication</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#EED9C4] flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-neutral-800" />
              </div>
              <h3 className="font-semibold text-lg mb-2">ML-Powered Routing</h3>
              <p className="text-sm text-neutral-600">AI automatically routes complaints using TF-IDF vectors and cosine similarity</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-[#F9F2EB]">
        <div className="container px-4 mx-auto sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Built for scale, security, and AI-powered automation
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-3xl mx-auto">
              From multi-channel intake to AI-powered routing, ServiceFlow uses machine learning to automatically assign complaints to the right teams with confidence scoring and review flags.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <Database className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>Multi-Tenant Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Complete data isolation between organizations with tenant-scoped roles, permissions, and API keys for enterprise-grade security.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <Code className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>REST API Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Connect web apps, mobile platforms, and third-party systems through secure, well-documented REST APIs with webhook support.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <MessageCircle className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>Multi-Channel Capture</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Accept complaints from web portals, mobile apps, email, chat, and external systems through unified API endpoints.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>Role-Based Access Control</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Granular permissions for admins, staff, and support teams with customizable roles and department-level access.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <Zap className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>ML-Powered Intelligent Routing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Automatically route complaints to departments or employees using TF-IDF vectorization and cosine similarity. Confidence scores and review flags ensure accuracy.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <BarChart2 className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>Analytics & Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Track resolution times, complaint patterns, and team performance with extensible analytics ready for ML integration.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <ClipboardCheck className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>Compliance & Audit Trails</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Complete audit logs for every action, status change, and interaction to meet regulatory requirements and compliance standards.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>Secure API Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Organization-scoped API keys with granular permissions, rate limiting, and secure token management for all integrations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-lg bg-[#EED9C4] flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-neutral-800" />
                </div>
                <CardTitle>Vector-Based ML System</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600">
                  Department and employee vectors stored in-database enable real-time ML predictions. Model versioning and confidence thresholds ensure reliable routing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-white">
        <div className="container px-4 mx-auto sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Why enterprises choose ServiceFlow
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-3xl mx-auto">
              Built for organizations that demand scalability, security, and data-driven customer service operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#EED9C4] flex items-center justify-center shrink-0">
                  <Cloud className="h-5 w-5 text-neutral-800" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    SaaS-Ready Scalability
                  </h3>
                  <p className="text-neutral-600">
                    Multi-tenant architecture ensures each organization operates in complete isolation while sharing a unified, scalable infrastructure. Perfect for growing SaaS platforms.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#EED9C4] flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5 text-neutral-800" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Enterprise-Grade Security
                  </h3>
                  <p className="text-neutral-600">
                    Tenant-scoped data access, role-based permissions, secure API authentication, and comprehensive audit trails ensure your customer data remains protected.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#EED9C4] flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-neutral-800" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    AI-Driven Operations
                  </h3>
                  <p className="text-neutral-600">
                    ML-powered routing with confidence scoring automatically assigns complaints to the right teams. Track patterns, resolution metrics, and continuously improve routing accuracy.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#EED9C4] flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-neutral-800" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Seamless Integration
                  </h3>
                  <p className="text-neutral-600">
                    API-first design enables easy integration with existing CRM systems, mobile apps, web platforms, and third-party services through well-documented REST endpoints.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#EED9C4] flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-neutral-800" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Regulatory Compliance
                  </h3>
                  <p className="text-neutral-600">
                    Complete audit trails, data retention policies, and compliance-ready documentation help you meet industry regulations and pass audits with confidence.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-[#EED9C4] flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5 text-neutral-800" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Production-Ready ML
                  </h3>
                  <p className="text-neutral-600">
                    ML routing is live and operational. TF-IDF vectorization, model versioning, and confidence-based assignment ensure reliable, scalable complaint routing out of the box.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[#F9F2EB]">
        <div className="container px-4 mx-auto sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-3xl mx-auto">
              Learn more about ServiceFlow's architecture and capabilities.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-lg font-medium cursor-pointer">
                  How does multi-tenant isolation work in ServiceFlow?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600 text-lg">
                  ServiceFlow uses tenant-scoped data access at the database level, ensuring each organization's complaints, users, and configurations are completely isolated. API keys are organization-specific, and all queries are automatically filtered by tenant ID to prevent cross-tenant data access.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-medium cursor-pointer">
                  What APIs does ServiceFlow provide?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600 text-lg">
                  ServiceFlow offers comprehensive REST APIs for complaint submission, retrieval, updates, assignment, and status management. Additional endpoints support user management, department configuration, analytics queries, and webhook integrations for real-time notifications.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-lg font-medium cursor-pointer">
                  How does role-based access control work?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600 text-lg">
                  ServiceFlow supports customizable roles (Admin, Manager, Staff, Support) with granular permissions. Admins can configure organizational settings, managers can assign and oversee complaints, while staff can only view and update assigned cases. All roles are tenant-scoped for security.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-lg font-medium cursor-pointer">
                  How does ML-powered routing work?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600 text-lg">
                  ServiceFlow uses TF-IDF vectorization to convert complaint text and department/employee keywords into numerical vectors. When a complaint is submitted, the ML service calculates cosine similarity between the complaint vector and all department/employee vectors, automatically routing to the best match with confidence scores. Low-confidence assignments are flagged for review.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-lg font-medium cursor-pointer">
                  What ML capabilities are currently available?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600 text-lg">
                  ServiceFlow includes a production-ready ML classifier service built with FastAPI. It supports department and employee routing modes, generates TF-IDF vectors from keywords, stores vectors in-database for fast lookups, and provides confidence-based assignment with automatic review flags. Model versioning ensures you can retrain and deploy new models without downtime.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-lg font-medium cursor-pointer">
                  What compliance features does ServiceFlow offer?
                </AccordionTrigger>
                <AccordionContent className="text-neutral-600 text-lg">
                  ServiceFlow maintains complete audit trails for all actions, supports data retention policies, provides secure API authentication, and enables GDPR-compliant data export and deletion. All changes to complaints are logged with timestamps and user attribution for regulatory compliance.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container px-4 mx-auto sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-neutral-600 max-w-3xl mx-auto">
              Choose the plan that fits your organization's needs. All plans include ML-powered routing and multi-tenant isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <Card className="border-2 border-neutral-200 hover:border-[#EED9C4] transition-colors">
              <CardHeader>
                <CardTitle className="text-2xl">Starter</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-neutral-600">/month</span>
                </div>
                <p className="text-sm text-neutral-600 mt-2">Perfect for small teams</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Up to 1,000 complaints/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">ML-powered routing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Up to 5 departments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Up to 10 employees</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">API access included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Email support</span>
                  </li>
                </ul>
                <Button className="w-full bg-[#EED9C4] text-neutral-900 hover:bg-[#E6C8B4] mt-6">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="border-2 border-[#EED9C4] relative shadow-lg">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#EED9C4] text-neutral-900 px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Professional</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$299</span>
                  <span className="text-neutral-600">/month</span>
                </div>
                <p className="text-sm text-neutral-600 mt-2">For growing businesses</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Up to 10,000 complaints/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Advanced ML routing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Unlimited departments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Unlimited employees</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Priority API access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Priority support</span>
                  </li>
                </ul>
                <Button className="w-full bg-neutral-900 text-white hover:bg-neutral-800 mt-6">
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="border-2 border-neutral-200 hover:border-[#EED9C4] transition-colors">
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Custom</span>
                </div>
                <p className="text-sm text-neutral-600 mt-2">For large organizations</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Unlimited complaints</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Custom ML models</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Dedicated infrastructure</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">SLA guarantees</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">24/7 dedicated support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-[#EED9C4]" />
                    <span className="text-sm">On-premise deployment</span>
                  </li>
                </ul>
                <Button className="w-full bg-[#EED9C4] text-neutral-900 hover:bg-[#E6C8B4] mt-6">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#EED9C4]">
        <div className="container px-4 mx-auto sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold sm:text-4xl text-neutral-900">
              Ready to automate your complaint management?
            </h2>
            <p className="mt-4 text-lg text-neutral-700">
              Join forward-thinking organizations using AI-powered routing to deliver faster, more accurate customer support.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-neutral-900 text-white hover:bg-neutral-800"
              >
                Get API Access
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-neutral-900 text-neutral-900 hover:bg-neutral-200"
              >
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-neutral-900 text-white">
        <div className="container px-4 mx-auto sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-md bg-[#EED9C4] flex items-center justify-center">
                  <ClipboardCheck size={20} className="text-neutral-800" />
                </div>
                <span className="text-xl font-bold">ServiceFlow</span>
              </div>
              <p className="text-sm text-neutral-400">
                Enterprise-grade complaint management for modern, scalable businesses.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#features" className="text-sm text-neutral-400 hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-neutral-400 hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    API Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    Developer Docs
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    Case Studies
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    Enterprise
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-neutral-400 hover:text-white">
                    Partners
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-neutral-400">
              &copy; {new Date().getFullYear()} ServiceFlow. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <a href="#" className="text-sm text-neutral-400 hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-neutral-400 hover:text-white">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-neutral-400 hover:text-white">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}