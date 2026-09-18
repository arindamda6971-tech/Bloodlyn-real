import { useQuery } from "@tanstack/react-query";
import { Building2, Heart, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useFavoriteLabs } from "@/hooks/useFavoriteLabs";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";

const SavedLabsScreen = () => {
  useSEO({ title: "Saved Labs | BloodLyn", description: "View and manage your saved BloodLyn partner labs." });
  const navigate = useNavigate();
  const { favoriteLabIds, isLoading: favoritesLoading, toggleFavorite, isToggling } = useFavoriteLabs();

  const { data: labs = [], isLoading: labsLoading } = useQuery({
    queryKey: ["saved-lab-details", favoriteLabIds],
    enabled: favoriteLabIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostic_centers")
        .select("id, name, address, city, state, rating, reviews_count, logo_url, is_active")
        .in("id", favoriteLabIds);
      if (error) throw error;
      const rank = new Map(favoriteLabIds.map((id, index) => [id, index]));
      return (data ?? []).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    },
  });

  const loading = favoritesLoading || (favoriteLabIds.length > 0 && labsLoading);

  return (
    <MobileLayout showNav={false} className="min-h-screen bg-background">
      <ScreenHeader title="Saved Labs" />
      <main className="space-y-4 px-4 py-5">
        <div>
          <h1 className="text-xl font-black text-foreground">Your favorite labs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quickly return to partner labs you trust.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16" aria-label="Loading saved labs">
            <LoadingSpinner size="lg" />
          </div>
        ) : labs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Heart className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-base font-black text-foreground">No saved labs yet</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Tap the heart on a Partner Labs banner to keep it here.
            </p>
            <Button className="mt-6" onClick={() => navigate("/home")}>Explore partner labs</Button>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {labs.map((lab) => (
              <article key={lab.id} className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${lab.is_active === false ? "opacity-70 grayscale" : ""}`}>
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10">
                    {lab.logo_url ? (
                      <img src={lab.logo_url} alt={`${lab.name} logo`} className="h-10 w-10 object-contain" loading="lazy" decoding="async" />
                    ) : (
                      <Building2 className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="truncate font-bold text-foreground">{lab.name}</h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isToggling}
                        className="-mr-2 -mt-2 h-10 w-10 shrink-0 rounded-full"
                        aria-label={`Remove ${lab.name} from saved labs`}
                        onClick={() => toggleFavorite(lab.id)}
                      >
                        <Heart className="h-5 w-5 fill-destructive text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      <span className="font-bold text-foreground">{lab.rating ?? 4.5}</span>
                      <span>({(lab.reviews_count ?? 0).toLocaleString()} reviews)</span>
                    </div>
                    <div className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-2">{[lab.address, lab.city, lab.state].filter(Boolean).join(", ")}</span>
                    </div>
                  </div>
                </div>
                <Button className="mt-4 w-full" variant="outline" onClick={() => navigate(`/lab/${lab.id}`)}>
                  View lab
                </Button>
              </article>
            ))}
          </div>
        )}
      </main>
    </MobileLayout>
  );
};

export default SavedLabsScreen;