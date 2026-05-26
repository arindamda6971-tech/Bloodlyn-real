import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface FamilyMember {
  id: string;
  fullName: string;
  age: string;
  gender: string;
  phone: string;
  relationship: string;
  customRelationship?: string;
}

const RELATIONSHIPS = [
  "Self",
  "Father",
  "Mother",
  "Husband",
  "Wife",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Grandfather",
  "Grandmother",
  "Other",
] as const;

export { RELATIONSHIPS };

// Legacy localStorage key for migration
const LEGACY_STORAGE_KEY = "bloodlyn-family-members";

function getLegacyStorageKey(userId: string | null) {
  return userId ? `${LEGACY_STORAGE_KEY}-${userId}` : LEGACY_STORAGE_KEY;
}

function mapRowToMember(row: any): FamilyMember {
  return {
    id: row.id,
    fullName: row.full_name,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    relationship: row.relationship,
    customRelationship: row.custom_relationship || undefined,
  };
}

export function useFamilyMembers() {
  const { supabaseUserId } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from Supabase and migrate legacy localStorage data
  useEffect(() => {
    if (!supabaseUserId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const fetchAndMigrate = async () => {
      setLoading(true);
      try {
        // Migrate legacy localStorage data if present
        const legacyKey = getLegacyStorageKey(supabaseUserId);
        const legacyData = localStorage.getItem(legacyKey);
        if (legacyData) {
          try {
            const legacyMembers: FamilyMember[] = JSON.parse(legacyData);
            if (legacyMembers.length > 0) {
              const rows = legacyMembers.map((m) => ({
                user_id: supabaseUserId,
                full_name: m.fullName,
                age: m.age,
                gender: m.gender,
                phone: m.phone,
                relationship: m.relationship,
                custom_relationship: m.customRelationship || null,
              }));
              await supabase.from("family_members").upsert(rows, { onConflict: "id" });
            }
          } catch {
            // Ignore parse errors
          }
          // Remove legacy data regardless
          localStorage.removeItem(legacyKey);
          // Also clean the non-user-scoped key
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }

        // Fetch from Supabase
        const { data, error } = await supabase
          .from("family_members")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching family members:", error.message);
          setMembers([]);
        } else {
          setMembers((data || []).map(mapRowToMember));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAndMigrate();
  }, [supabaseUserId]);

  const addMember = useCallback(
    async (member: Omit<FamilyMember, "id">) => {
      if (!supabaseUserId) return null;

      // Dedup guard — never insert a duplicate (same name + same phone OR relationship)
      const trimmedName = member.fullName.trim().toLowerCase();
      const existsLocal = members.find(
        (m) =>
          m.fullName.trim().toLowerCase() === trimmedName &&
          (m.phone === member.phone || m.relationship === member.relationship)
      );
      if (existsLocal) {
        return existsLocal;
      }

      const { data, error } = await supabase
        .from("family_members")
        .insert({
          user_id: supabaseUserId,
          full_name: member.fullName,
          age: member.age,
          gender: member.gender,
          phone: member.phone,
          relationship: member.relationship,
          custom_relationship: member.customRelationship || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding family member:", error.message);
        return null;
      }

      const newMember = mapRowToMember(data);
      setMembers((prev) => {
        // Final guard in setter against race conditions
        if (prev.some((m) => m.id === newMember.id)) return prev;
        return [...prev, newMember];
      });
      return newMember;
    },
    [supabaseUserId, members]
  );


  const removeMember = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) {
        console.error("Error removing family member:", error.message);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== id));
    },
    []
  );

  const updateMember = useCallback(
    async (id: string, data: Omit<FamilyMember, "id">) => {
      const { error } = await supabase
        .from("family_members")
        .update({
          full_name: data.fullName,
          age: data.age,
          gender: data.gender,
          phone: data.phone,
          relationship: data.relationship,
          custom_relationship: data.customRelationship || null,
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating family member:", error.message);
        return;
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...data, id } : m))
      );
    },
    []
  );

  return { members, addMember, removeMember, updateMember, loading };
}
