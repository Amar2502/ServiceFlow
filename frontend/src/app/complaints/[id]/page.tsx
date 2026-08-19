"use client";

import { use } from "react";
import { redirect } from "next/navigation";

export default function RedirectComplaintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  redirect(`/dashboard/complaints/${resolvedParams.id}`);
}
