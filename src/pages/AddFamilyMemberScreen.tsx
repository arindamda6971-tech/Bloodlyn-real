import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { RELATIONSHIPS, type FamilyMember, useFamilyMembers } from "@/hooks/useFamilyMembers";
import { toast } from "sonner";
import { triggerHaptic } from "@/utils/haptics";

interface LocationState {
  editMember?: FamilyMember | null;
  returnTo?: string;
}

const AddFamilyMemberScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const editMember = state?.editMember || null;
  const returnTo = state?.returnTo || "/family";

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [customRelationship, setCustomRelationship] = useState("");

  const { addMember, updateMember } = useFamilyMembers();

  useEffect(() => {
    if (editMember) {
      setFullName(editMember.fullName);
      setAge(editMember.age);
      setGender(editMember.gender);
      setPhone(editMember.phone);
      setRelationship(editMember.relationship);
      setCustomRelationship(editMember.customRelationship || "");
    }
  }, [editMember]);

  const isSubmittingRef = useRef(false);

  const handleSubmit = () => {
    if (isSubmittingRef.current) return;
    
    if (!fullName.trim()) { toast.error("Full name is required"); return; }
    if (!age || Number(age) < 1 || Number(age) > 120) { toast.error("Enter valid age (1–120)"); return; }
    if (!gender) { toast.error("Gender is required"); return; }
    if (!/^\d{10}$/.test(phone)) { toast.error("Enter valid 10-digit phone"); return; }
    if (!relationship) { toast.error("Relationship is required"); return; }
    if (relationship === "Other" && !customRelationship.trim()) { toast.error("Please specify relationship"); return; }

    const memberData = {
      fullName: fullName.trim(),
      age,
      gender,
      phone,
      relationship,
      customRelationship: relationship === "Other" ? customRelationship.trim() : undefined,
    };

    isSubmittingRef.current = true;

    const saveAndNavigate = async () => {
      try {
        if (editMember) {
          await updateMember(editMember.id, memberData);
        } else {
          await addMember(memberData);
        }
        await triggerHaptic('success');
        navigate(returnTo);
      } finally {
        isSubmittingRef.current = false;
      }
    };

    saveAndNavigate();
  };

  return (
    <MobileLayout showNav={false}>
      <ScreenHeader title={editMember ? "Edit Family Member" : "Add Family Member"} />

      <div className="px-4 mt-4 pb-32">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-muted border-0 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Age *</Label>
              <Input
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
                maxLength={3}
                className="bg-muted border-0 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender *</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="bg-muted border-0 rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Phone Number *</Label>
            <div className="flex items-center gap-2">
              <span className="flex h-10 items-center rounded-xl bg-muted px-3 text-sm font-medium text-muted-foreground select-none">
                +91
              </span>
              <Input
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                maxLength={10}
                className="bg-muted border-0 rounded-xl flex-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Relationship *</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger className="bg-muted border-0 rounded-xl">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {relationship === "Other" && (
            <div className="space-y-1.5">
              <Label>Specify Relationship *</Label>
              <Input
                placeholder="Enter relationship"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                className="bg-muted border-0 rounded-xl"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-card border-t border-border px-4 py-4 safe-area-bottom z-40"
      >
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="hero" className="flex-1" onClick={handleSubmit}>
            {editMember ? "Save Changes" : "Add Member"}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default AddFamilyMemberScreen;
