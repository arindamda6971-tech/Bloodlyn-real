import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { UserPlus, Pencil, Trash2, Phone, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileLayout from "@/components/layout/MobileLayout";
import { useFamilyMembers, type FamilyMember } from "@/hooks/useFamilyMembers";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FamilyMembersScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { members, addMember, removeMember, updateMember } = useFamilyMembers();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Header Squeeze logic
  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 60], [100, 70]);
  const titleOpacity = useTransform(scrollY, [0, 30], [1, 0.5]);
  const titleScale = useTransform(scrollY, [0, 30], [1, 0.9]);

  // Handle returning from AddFamilyMemberScreen
  const locationState = (location as any).state;
  useEffect(() => {
    if (locationState?.newMember) {
      if (locationState.editMemberId) {
        updateMember(locationState.editMemberId, locationState.newMember);
        toast.success("Family member updated");
      } else {
        addMember(locationState.newMember);
        toast.success("Family member added");
      }
      window.history.replaceState({}, document.title);
    }
  }, [locationState]);

  const handleDelete = async () => {
    if (deleteId) {
      await removeMember(deleteId);
      toast.success("Family member removed");
      setDeleteId(null);
    }
  };

  const goToAdd = (editMember?: FamilyMember) => {
    navigate("/add-family-member", {
      state: {
        editMember: editMember || null,
        returnTo: "/family-members",
      },
    });
  };

  return (
    <MobileLayout>
      <motion.header
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 px-6 overflow-hidden flex items-center justify-between"
        style={{
          height: headerHeight,
          paddingTop: "calc(env(safe-area-inset-top, 24px) + 8px)"
        }}
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center border border-white/20 shadow-sm">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <motion.h1
            style={{ opacity: titleOpacity, scale: titleScale, originX: 0 }}
            className="text-lg font-black text-foreground tracking-tight"
          >
            Family Members
          </motion.h1>
        </div>
        <button
          onClick={() => goToAdd()}
          className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 active:scale-90 transition-transform"
        >
          <UserPlus className="w-5 h-5" />
        </button>
      </motion.header>

      <div className="px-6 pb-24">
        {members.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-[2rem] bg-primary/5 flex items-center justify-center mb-6 border border-primary/10">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-black text-foreground mb-2">No Members Yet</h3>
            <p className="text-sm font-bold text-muted-foreground mb-8 max-w-[260px] opacity-60">
              Add family members to quickly book tests for them.
            </p>
            <Button variant="hero" className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={() => goToAdd()}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add First Member
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4 mt-6">
            <AnimatePresence mode="popLayout">
              {members.map((member, index) => (
                <motion.div
                  key={member.id}
                  layout
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="soft-card border border-white/50 bg-white/60 backdrop-blur-md p-5 shadow-sm shadow-black/5"
                >
<<<<<<< HEAD
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-accent/20 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                      <span className="text-lg font-bold text-primary">
=======
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                      <span className="text-xl font-black text-primary">
>>>>>>> d623537 (feat: Comprehensive Futuristic UI overhaul and Squeezable Header system)
                        {member.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-foreground truncate text-base mb-1">{member.fullName}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground opacity-60 uppercase tracking-widest">
                          {member.relationship === "Other" ? member.customRelationship : member.relationship}
                        </span>
                        <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                        <span className="text-xs font-bold text-muted-foreground opacity-60 uppercase tracking-widest">{member.age} yrs • {member.gender}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-primary/80">
                        <Phone className="w-3 h-3" />
                        <span className="text-[11px] font-black">+91 {member.phone}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => goToAdd(member)} className="p-2.5 rounded-xl bg-white/80 border border-border/50 text-muted-foreground shadow-sm">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(member.id)} className="p-2.5 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Button
                variant="outline"
                className="w-full h-14 rounded-2xl border-dashed border-2 font-black text-xs uppercase tracking-widest"
                onClick={() => goToAdd()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Member
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-3xl border-0 bg-background/90 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Remove Member?</AlertDialogTitle>
            <AlertDialogDescription className="font-bold opacity-70">
              This action cannot be undone. The member will be removed from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-2xl h-12 font-black uppercase tracking-widest text-[10px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-2xl h-12 bg-destructive text-white font-black uppercase tracking-widest text-[10px]">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default FamilyMembersScreen;
