import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
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

/** Asks before replacing a cart that holds another lab's tests. */
const LabConflictDialog = () => {
  const { pendingItem, confirmReplace, cancelReplace } = useCart();

  return (
    <AlertDialog open={!!pendingItem} onOpenChange={(open) => !open && cancelReplace()}>
      <AlertDialogContent className="max-w-[90%] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Different Lab Selected</AlertDialogTitle>
          <AlertDialogDescription>
            You have items from <span className="font-semibold text-foreground">{pendingItem?.existingLabName}</span>.
            You can't add tests from another lab at the same time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2">
          <AlertDialogCancel className="flex-1 mt-0" onClick={cancelReplace}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="flex-1"
            onClick={() => {
              confirmReplace();
              toast.success("Cart replaced with new lab items");
            }}
          >
            Replace Cart
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LabConflictDialog;
