import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/subscription";
import { VetVerificationTable } from "./VetVerificationTable";
import type { AdminVetListItem } from "@/app/api/admin/vets/route";

export const metadata: Metadata = {
  title: "Vet Verification | PetBorder Admin",
};
import type { VetProfileRow, VetClinicRow, ProfileRow } from "@/types/database";

export const dynamic = "force-dynamic";

async function fetchVetsData(): Promise<AdminVetListItem[]> {
  const service = createServiceClient();

  const { data: vetProfiles } = await service
    .from("vet_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const profiles = (vetProfiles ?? []) as VetProfileRow[];
  if (profiles.length === 0) return [];

  const clinicIds = [...new Set(profiles.map((p) => p.clinic_id).filter(Boolean))] as string[];
  const userIds = profiles.map((p) => p.user_id);

  const [clinicsResult, usersResult] = await Promise.all([
    clinicIds.length > 0
      ? service.from("vet_clinics").select("id, name").in("id", clinicIds)
      : Promise.resolve({ data: [] }),
    service.from("profiles").select("id, email").in("id", userIds),
  ]);

  const clinicMap = new Map<string, string>();
  for (const clinic of (clinicsResult.data ?? []) as Pick<VetClinicRow, "id" | "name">[]) {
    clinicMap.set(clinic.id, clinic.name);
  }

  const userEmailMap = new Map<string, string>();
  for (const profile of (usersResult.data ?? []) as Pick<ProfileRow, "id" | "email">[]) {
    userEmailMap.set(profile.id, profile.email);
  }

  return profiles.map((vp) => ({
    id: vp.id,
    user_id: vp.user_id,
    user_email: userEmailMap.get(vp.user_id) ?? "",
    clinic_id: vp.clinic_id,
    clinic_name: vp.clinic_id ? (clinicMap.get(vp.clinic_id) ?? null) : null,
    ahpra_number: vp.ahpra_number,
    daff_approved: vp.daff_approved,
    verified_at: vp.verified_at,
    created_at: vp.created_at,
  }));
}

export default async function AdminVetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/admin/vets");
  }

  const role = await getUserRole(user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const vets = await fetchVetsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1B4F72]">Vet Registrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          {vets.length} registration{vets.length !== 1 ? "s" : ""}
        </p>
      </div>

      <VetVerificationTable initialVets={vets} />
    </div>
  );
}
