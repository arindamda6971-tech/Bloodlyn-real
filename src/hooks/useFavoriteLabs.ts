import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const favoriteLabsKey = (userId?: string) => ["favorite-labs", userId ?? "signed-out"] as const;

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
      const result = action === 'remove'
        ? await supabase.from("favorite_labs").delete().eq("user_id", user.id).eq("lab_id", labId)
        : await supabase.from("favorite_labs").insert({ user_id: user.id, lab_id: labId });
      if (result.error) throw result.error;
      return { labId, action };
    },
    onMutate: async ({ labId, action }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey) ?? [];
      const next = action === 'add'
        ? [labId, ...previous]
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
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const favoriteLabIds = favoritesQuery.data ?? [];
  return {
    favoriteLabIds,
    favoriteCount: favoriteLabIds.length,
    isLoading: favoritesQuery.isLoading,
    isFavorite: (labId: string) => favoriteLabIds.includes(labId),
    toggleFavorite: (labId: string) => {
      const isFav = favoriteLabIds.includes(labId);
      toggleMutation.mutate({ labId, action: isFav ? 'remove' : 'add' });
    },
    isToggling: toggleMutation.isPending,
  };
};