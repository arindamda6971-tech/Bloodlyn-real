import { testInfo, testInstructions, testRequirements, type TestDetails } from "@/lib/test-details";

interface Props {
  test: TestDetails;
  /** Also show the lab's own instructions, for when the patient is about to book. */
  withInstructions?: boolean;
  className?: string;
}

/**
 * One line of facts split by dots. Each dot belongs to the fact after it, and the
 * first fact on any row has its dot clipped, so a wrap never leaves one stranded.
 */
const FactLine = ({ facts, tone }: { facts: string[]; tone: string }) => (
  <div data-fact-line className="overflow-hidden">
    <ul className={`-ml-2.5 flex flex-wrap ${tone}`}>
      {facts.map((fact) => (
        <li key={fact} className="relative pl-2.5 before:absolute before:left-[3px] before:content-['·']">
          {fact}
        </li>
      ))}
    </ul>
  </div>
);

/**
 * A test's details as plain lines of text, not tags: they wrap on narrow phones
 * and can't overlap, however many apply. Lines with nothing to say aren't drawn.
 */
export function TestFacts({ test, withInstructions = false, className = "" }: Props) {
  const requirements = testRequirements(test, withInstructions);
  const info = testInfo(test);
  const instructions = withInstructions ? testInstructions(test) : [];
  if (requirements.length + info.length + instructions.length === 0) return null;

  return (
    <div className={`space-y-0.5 text-[11px] leading-snug ${className}`}>
      {requirements.length > 0 && <FactLine facts={requirements} tone="font-bold text-destructive" />}
      {info.length > 0 && <FactLine facts={info} tone="font-medium text-muted-foreground" />}
      {instructions.map((item) => (
        <p key={item.label} className="text-muted-foreground">
          <span className="font-bold text-foreground">{item.label}:</span> {item.text}
        </p>
      ))}
    </div>
  );
}
