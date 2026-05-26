import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { RELATIONSHIPS, type FamilyMember } from "@/hooks/useFamilyMembers";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (member: Omit<FamilyMember, "id">) => void | Promise<any>;
  editMember?: FamilyMember | null;
  onEdit?: (id: string, data: Omit<FamilyMember, "id">) => void | Promise<any>;
  existingMembers?: FamilyMember[];
}

const AddFamilyMemberDialog = ({ open, onOpenChange, onAdd, editMember, onEdit, existingMembers = [] }: Props) => {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [customRelationship, setCustomRelationship] = useState("");
  const submittingRef = useRef(false);


  // Populate fields when editing
  const populateFromMember = (member: FamilyMember) => {
    setFullName(member.fullName);
    setAge(member.age);
    setGender(member.gender);
    setPhone(member.phone);
    setRelationship(member.relationship);
    setCustomRelationship(member.customRelationship || "");
  };

  useEffect(() => {
    if (open && editMember) {
      populateFromMember(editMember);
    } else if (open && !editMember) {
      reset();
    }
  }, [open, editMember]);

  const reset = () => {
    setFullName("");
    setAge("");
    setGender("");
    setPhone("");
    setRelationship("");
    setCustomRelationship("");
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!fullName.trim()) { toast.error("Full name is required"); return; }
    if (!age || Number(age) < 1 || Number(age) > 120) { toast.error("Enter valid age (1–120)"); return; }
    if (!gender) { toast.error("Gender is required"); return; }
    if (!/^\d{10}$/.test(phone)) { toast.error("Enter valid 10-digit phone"); return; }
    if (!relationship) { toast.error("Relationship is required"); return; }
    if (relationship === "Other" && !customRelationship.trim()) { toast.error("Please specify relationship"); return; }

    const trimmedName = fullName.trim();

    // Dedup guard — block adding an identical member (same name+phone, or same name+relation)
    if (!editMember) {
      const duplicate = existingMembers.find((m) =>
        m.fullName.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (m.phone === phone || m.relationship === relationship)
      );
      if (duplicate) {
        toast.error("This family member already exists");
        return;
      }
    }

    submittingRef.current = true;
    const memberData = {
      fullName: trimmedName,
      age,
      gender,
      phone,
      relationship,
      customRelationship: relationship === "Other" ? customRelationship.trim() : undefined,
    };

    try {
      if (editMember && onEdit) {
        await onEdit(editMember.id, memberData);
        toast.success("Family member updated");
      } else {
        await onAdd(memberData);
        toast.success("Family member added");
      }
      reset();
      onOpenChange(false);
    } finally {
      submittingRef.current = false;
    }
  };


  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-[95vw] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editMember ? "Edit Family Member" : "Add Family Member"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-muted border-0 rounded-xl"
            />
          </div>

          {/* Age + Gender */}
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

          {/* Phone */}
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

          {/* Relationship */}
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSubmit}>
            {editMember ? "Save Changes" : "Add Member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFamilyMemberDialog;
