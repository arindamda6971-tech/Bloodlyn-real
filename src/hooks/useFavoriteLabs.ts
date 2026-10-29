import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const favoriteLabsKey = (userId?: string) => ["favorite-labs", userId ?? "signed-out"] as const;

// Labs with a save/remove request in flight, shared by every screen using the
// hook. A second tap while one is pending would race it (the insert and delete
// can land in either order), so it is ignored instead.
const pendingLabs = new Set<string>();

export const useFavoriteLabs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = favoriteLabsKey(user?.id);

  const favoritesQuery = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return [] as string[];
      const { data, error } = await supabase
        .from("favorite_labs")
        .select("lab_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((favorite) => favorite.lab_id);
    },
    staleTime: 60_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ labId, action }: { labId: string, action: 'add' | 'remove' }) => {
      if (!user?.id) throw new Error("Please sign in to save a lab");
      // Both directions are idempotent, so a lab already saved (or already
      // removed) elsewhere doesn't fail with a duplicate-key error.
      const result = action === 'remove'
        ? await supabase.from("favorite_labs").delete().eq("user_id", user.id).eq("lab_id", labId)
        : await supabase
          .from("favorite_labs")
          .upsert({ user_id: user.id, lab_id: labId }, { onConflict: "user_id,lab_id", ignoreDuplicates: true });
      if (result.error) throw result.error;
      return { labId, action };
    },
    onMutate: async ({ labId, action }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey) ?? [];
      const next = action === 'add'
        ? [labId, ...previous.filter((id) => id !== labId)]
        : previous.filter((id) => id !== labId);
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous ?? []);
      toast.error(error instanceof Error ? error.message : "Could not update saved labs");
    },
    onSuccess: ({ action }) => {
      toast.success(action === 'add' ? "Lab saved to your profile" : "Lab removed from saved");
    },
    onSettled: (_data, _error, { labId }) => {
      pendingLabs.delete(labId);
      return queryClient.invalidateQueries({ queryKey });
    },
  });

  const favoriteLabIds = favoritesQuery.data ?? [];
  return {
    favoriteLabIds,
    favoriteCount: favoriteLabIds.length,
    isLoading: favoritesQuery.isLoading,
    /** True once the user's saved labs have loaded. */
    isReady: Boolean(user?.id) && favoritesQuery.isSuccess,
    isFavorite: (labId: string) => favoriteLabIds.includes(labId),
    // Does what the heart showed: an empty heart saves (harmless if the list
    // hadn't loaded and the lab was already saved), a filled one removes.
    toggleFavorite: (labId: string) => {
      if (!user?.id) {
        toast.error("Please sign in to save a lab");
        return;
      }
      if (pendingLabs.has(labId)) return;
      pendingLabs.add(labId);
      const isFav = favoriteLabIds.includes(labId);
      toggleMutation.mutate({ labId, action: isFav ? 'remove' : 'add' });
    },
    isToggling: toggleMutation.isPending,
  };
};
