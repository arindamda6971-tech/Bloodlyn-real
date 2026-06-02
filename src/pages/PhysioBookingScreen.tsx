import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock,
  MapPin,
  Navigation,
  Plus,
  Check,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PatientPhonePill from "@/components/ui/PatientPhonePill";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Address = Tables<"addresses">;

interface Physiotherapist {
  id: string;
  name: string;
  specialty: string;
  experience: string | number;
  rating: number;
  reviews_count: number;
  fee: number;
  available?: boolean;
  qualification?: string;
  image?: string | null;
}

interface LocationState {
  physio: Physiotherapist;
}

const PhysioBookingScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { supabaseUserId } = useAuth();

  const locationState = location.state as LocationState | null;
  const physio = locationState?.physio;
  const incomingPatientPhone = (location.state as any)?.patientPhone ?? null;
  const incomingPatientName = (location.state as any)?.patientName ?? "";
  const incomingPatientAge = (location.state as any)?.patientAge ?? "";
  const incomingPatientGender = (location.state as any)?.patientGender ?? "";

  const [patientName, setPatientName] = useState<string>(String(incomingPatientName || ""));
  const [patientAge, setPatientAge] = useState<string>(incomingPatientAge ? String(incomingPatientAge) : "");
  const [patientGender, setPatientGender] = useState<string>(String(incomingPatientGender || ""));
  const [patientPhone, setPatientPhone] = useState<string>(incomingPatientPhone ? String(incomingPatientPhone) : "");
  const isPatientInfoValid =
    patientName.trim().length > 0 &&
    /^\d{1,3}$/.test(patientAge) &&
    Number(patientAge) > 0 &&
    Number(patientAge) <= 120 &&
    patientGender.trim().length > 0 &&
    /^\d{10}$/.test(patientPhone); 

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // selected date (used for scheduling)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Fixed 2-hour time windows (matches screenshot)
  const timeWindows = [
    "6:00 AM - 8:00 AM",
    "8:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 2:00 PM",
    "2:00 PM - 4:00 PM",
    "4:00 PM - 6:00 PM",
    "6:00 PM - 8:00 PM",
  ];

  const getNext7Days = () => {
    const days: { iso: string; weekday: string; day: number; month: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
        day: d.getDate(),
        month: d.toLocaleDateString(undefined, { month: "short" }),
      });
    }
    return days;
  };

  // Add Address Modal State
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    type: "Home",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    is_default: false,
  });

  const slots = timeWindows; // legacy name kept for rendering consistency

  const fetchAddresses = async () => {
    if (!supabaseUserId) {
      setLoadingAddresses(false);
      return;
    }
    
    setLoadingAddresses(true);
    
    try {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", supabaseUserId)
        .order("is_default", { ascending: false });

      if (error) {
        console.error("Error fetching addresses:", error);
        setAddresses([]);
      } else if (data) {
        setAddresses(data);
        const defaultAddress = data.find(addr => addr.is_default) || data[0];
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      } else {
        setAddresses([]);
      }
    } catch (err) {
      console.error("Exception fetching addresses:", err);
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (!physio) {
      navigate("/physio-consult");
      return;
    }
    fetchAddresses();
  }, [supabaseUserId, physio]);

  const handleSaveAddress = async () => {
    if (!supabaseUserId) {
      toast.error("Please log in to add an address");
      return;
    }

    if (!newAddress.address_line1 || !newAddress.city || !newAddress.state || !newAddress.pincode) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSavingAddress(true);
    try {
      const { data, error } = await supabase
        .from("addresses")
        .insert({
          user_id: supabaseUserId,
          type: newAddress.type,
          address_line1: newAddress.address_line1,
          address_line2: newAddress.address_line2 || null,
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
          is_default: newAddress.is_default || addresses.length === 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Address added successfully");
      setShowAddAddressModal(false);
      setNewAddress({
        type: "Home",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        is_default: false,
      });
      
      await fetchAddresses();
      if (data) {
        setSelectedAddressId(data.id);
      }
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to add address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!physio) return;

    if (!selectedAddressId && addresses.length > 0) {
      toast.error("Please select an address");
      return;
    }

    if (addresses.length === 0) {
      toast.error("Please add an address to proceed");
      return;
    }

    navigate("/payment", {
      state: {
        cartItems: [{
          id: `physio-${physio.id}`,
          name: `Physiotherapy Session with ${physio.name}`,
          price: physio.fee,
          quantity: 1,
        }],
        addressId: selectedAddressId,
        scheduledDate: selectedDate,
        scheduledTimeSlot: selectedTime || "",
        subtotal: physio.fee,
        bookingType: "physio",
        physioName: physio.name,
        patientName: patientName.trim() || null,
        patientAge: patientAge ? Number(patientAge) : null,
        patientGender: patientGender || null,
        patientPhone: patientPhone.trim() || null,
      },
    });
  };

  if (!physio) {
    return null;
  }

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Book Physio Appointment" />

      <div className="px-4 pb-44">
        {/* Physio Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 mb-4 flex items-center gap-3 p-4 rounded-2xl bg-secondary/10 border border-secondary/20"
        >
          <img
            src={physio.image ?? undefined}
            alt={physio.name}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{physio.name}</p>
            <p className="text-xs text-muted-foreground">{physio.specialty}</p>
            <p className="text-xs text-muted-foreground">{physio.experience} experience</p>
            {patientName && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Patient</p>
                <p className="font-semibold text-foreground">{patientName}</p>
                <p className="text-xs text-muted-foreground">Age: {patientAge || 'N/A'} • Gender: {patientGender || 'N/A'}</p>
              </div>
            )}
          </div>
          <Badge variant={physio.available ? "live" : "secondary"}>
            {physio.available ? "Online" : "Offline"}
          </Badge>
        </motion.div>

        {/* Patient details */}
        <div className="mt-4 p-4 rounded-2xl bg-muted/50 border border-border">
          <h3 className="font-semibold text-foreground mb-3">Patient details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="patient_name">Patient name</Label>
              <Input
                id="patient_name"
                placeholder="e.g. John Doe"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                aria-label="Patient name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient_age">Age</Label>
              <Input
                id="patient_age"
                placeholder="e.g. 35"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value.replace(/[^0-9]/g, ""))}
                aria-label="Patient age"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient_gender">Gender</Label>
              <Select value={patientGender} onValueChange={(value) => setPatientGender(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="patient_phone">Phone number</Label>
              <Input
                id="patient_phone"
                placeholder="10-digit mobile number"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value.replace(/[^0-9]/g, ""))}
                aria-label="Patient phone"
                maxLength={10}
              />
            </div>
          </div>
          {!isPatientInfoValid && (
            <div className="mt-3 text-xs text-destructive">Please provide a valid patient name, age (1–120), gender, and 10-digit phone number.</div>
          )}
        </div>

        {/* Patient phone (if provided) */}
        {patientPhone && (
          <div className="mt-4">
            <PatientPhonePill phone={patientPhone} />
          </div>
        )}

        {/* Select Date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Select Date</h3>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {getNext7Days().map((d) => (
              <button
                key={d.iso}
                onClick={() => setSelectedDate(d.iso)}
                className={`min-w-[68px] py-3 px-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                  selectedDate === d.iso ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <span className="text-xs font-medium">{d.weekday}</span>
                <span className="text-lg font-bold">{d.day}</span>
                <span className="text-[10px] text-muted-foreground">{d.month}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-foreground">Select Time Slot</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {timeWindows.map((tw) => (
              <button
                key={tw}
                onClick={() => setSelectedTime(tw)}
                className={`py-3 px-4 rounded-xl text-center transition-all ${
                  selectedTime === tw ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm font-medium">{tw}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Address Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Your Address</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => setShowAddAddressModal(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add New
            </Button>
          </div>

          {loadingAddresses ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="p-6 rounded-xl bg-muted/50 text-center">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No addresses saved</p>
              <Button
                variant="outline"
                onClick={() => setShowAddAddressModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Address
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  onClick={() => setSelectedAddressId(address.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    selectedAddressId === address.id
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted/50 border border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedAddressId === address.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border border-border"
                    }`}>
                      {selectedAddressId === address.id && <Check className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="soft" className="text-xs">{address.type}</Badge>
                        {address.is_default && (
                          <Badge variant="outline" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Price Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-4 rounded-2xl bg-muted/50 border border-border"
        >
          <h3 className="font-semibold text-foreground mb-3">Price Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Physio Session</span>
              <span className="text-foreground">₹{physio.fee}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Home Visit Charges</span>
              <span className="text-success">FREE</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-lg text-foreground">₹{physio.fee}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-24 left-0 right-0 max-w-[430px] mx-auto bg-card/95 backdrop-blur-xl border-t border-border px-4 py-4 safe-area-bottom"
      >
        <Button
          variant="hero"
          className="w-full"
          size="lg"
          disabled={!selectedAddressId || addresses.length === 0 || !selectedTime || !isPatientInfoValid}
          onClick={handleProceedToPayment}
        >
          Proceed to Pay • ₹{physio.fee}
        </Button>
      </motion.div>

      {/* Add Address Modal */}
      <Dialog open={showAddAddressModal} onOpenChange={setShowAddAddressModal}>
        <DialogContent className="max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Add New Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="type">Address Type</Label>
              <Select
                value={newAddress.type}
                onValueChange={(value) => setNewAddress({ ...newAddress, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1 *</Label>
              <Input
                id="address_line1"
                placeholder="House/Flat No., Building Name"
                value={newAddress.address_line1}
                onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                placeholder="Street, Area (Optional)"
                value={newAddress.address_line2}
                onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                placeholder="6-digit Pincode"
                value={newAddress.pincode}
                onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddAddressModal(false)}
              disabled={savingAddress}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              onClick={handleSaveAddress}
              disabled={savingAddress}
            >
              {savingAddress ? "Saving..." : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default PhysioBookingScreen;
