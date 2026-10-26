import { useCallback, useState } from "react";
import LabPickerSheet, { type LabPickerTest } from "./LabPickerSheet";

/** Opens the "Select a Lab" sheet for a test; render `sheet` once in the screen. */
export function useLabPicker() {
  const [test, setTest] = useState<LabPickerTest | null>(null);
  const open = useCallback((t: LabPickerTest) => setTest(t), []);
  const close = useCallback(() => setTest(null), []);
  return { open, sheet: <LabPickerSheet test={test} onClose={close} /> };
}
