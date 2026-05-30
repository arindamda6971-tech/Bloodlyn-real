import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Pencil, Trash2, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
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

  const handleDelete = async () => {
    if (deleteId) {
      await removeMember(deleteId);
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
      <ScreenHeader
        title="Family Members"
        rightAction={
          <Button variant="ghost" size="icon" onClick={() => goToAdd()}>
            <UserPlus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 pb-6">
        {members.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No Family Members</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
              Add family members to quickly book tests for them.
            </p>
            <Button variant="hero" onClick={() => goToAdd()}>
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3 mt-4">
            <AnimatePresence mode="popLayout">
              {members.map((member, index) => (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="soft-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {member.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-foreground truncate">{member.fullName}</h3>
                        <Badge variant="soft" className="shrink-0 text-xs">
                          {member.relationship === "Other" ? member.customRelationship : member.relationship}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{member.age} yrs</span>
                        <span>•</span>
                        <span>{member.gender}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5" />
                        <span>+91 {member.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => goToAdd(member)}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setDeleteId(member.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => goToAdd()}
              >
                <UserPlus className="w-4 h-4" />
                Add Another Member
              </Button>
            </motion.div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[90vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Family Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The member will be removed from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default FamilyMembersScreen;
