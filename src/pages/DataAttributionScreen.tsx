import { motion } from "framer-motion";
import { Database, FileText } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import PremiumPageHeader from "@/components/layout/PremiumPageHeader";
import { useSEO } from "@/hooks/useSEO";

const DataAttributionScreen = () => {
  useSEO({ title: "Data Attribution | BloodLyn", description: "Information regarding LOINC data usage and attribution." });

  return (
    <MobileLayout showNav={true}>
      <ScreenHeader title="Data Attribution" />
      
      <div className="px-4 pb-32 pt-1">
        {/* Premium Title Header */}
        <PremiumPageHeader
          title="Data Licensing"
          subtitle="Medical terminology & attributions"
          icon={Database}
          accent="from-blue-600 via-sky-600 to-indigo-600"
        />

        <div className="mt-6 space-y-4">
          <motion.section
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            className="p-5 rounded-3xl bg-card/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.15)] hover:border-primary/30 transition-all duration-300 group"
          >
            <div className="flex items-start gap-3.5 mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center flex-shrink-0 border border-border group-hover:scale-105 transition-transform duration-300">
                <FileText className="w-5 h-5 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">LOINC® Data Attribution & Disclaimer</h2>
              </div>
            </div>
            <div className="text-[12px] text-muted-foreground leading-relaxed font-medium space-y-4 mt-4">
              <p>
                Certain laboratory test names, identifiers, terminology, and/or related information displayed or used within the BloodLyn application may contain content derived from the Logical Observation Identifiers Names and Codes (LOINC®) database.
              </p>
              <p className="italic bg-muted/30 p-3 rounded-xl border border-border/50 text-[11px] leading-relaxed">
                "This material contains content from LOINC (<a href="http://loinc.org" target="_blank" rel="noreferrer" className="text-primary hover:underline">http://loinc.org</a>). LOINC is copyright © Regenstrief Institute, Inc. and the Logical Observation Identifiers Names and Codes (LOINC) Committee and is available at no cost under the license at <a href="http://loinc.org/license" target="_blank" rel="noreferrer" className="text-primary hover:underline">http://loinc.org/license</a>. LOINC® is a registered United States trademark of Regenstrief Institute, Inc."
              </p>
              <p>
                BloodLyn uses LOINC content for the purpose of identifying, organizing, searching, and displaying laboratory and clinical test information. BloodLyn does not claim ownership of the LOINC terminology, codes, or other LOINC-provided materials.
              </p>
              <h4 className="font-bold text-foreground mt-4 text-sm">Accuracy Disclaimer</h4>
              <p>
                The laboratory test information displayed through BloodLyn may be obtained from LOINC and/or other third-party sources and may contain omissions, inaccuracies, outdated information, terminology differences, or other errors. BloodLyn does not warrant or guarantee that such information is complete, current, accurate, or suitable for any particular medical, diagnostic, clinical, laboratory, or treatment purpose. Neither BloodLyn nor its officers, employees, partners, laboratories, doctors, or service providers shall be responsible or liable for any loss, damage, medical decision, diagnostic decision, treatment decision, or other consequence arising solely from reliance on third-party laboratory terminology, test names, codes, descriptions, or related information displayed through the application. Users and healthcare professionals should verify relevant test information, requirements, specimen types, reference ranges, preparation instructions, prices, availability, and other clinical or laboratory details with the applicable diagnostic laboratory or qualified healthcare professional before relying upon such information.
              </p>
              <h4 className="font-bold text-foreground mt-4 text-sm">No Medical Advice</h4>
              <p>
                Information relating to laboratory tests available through BloodLyn is provided for informational and service-related purposes only and does not constitute medical advice, diagnosis, treatment, or a substitute for professional medical judgment.
              </p>
              <h4 className="font-bold text-foreground mt-4 text-sm">Third-Party Content</h4>
              <p>
                Certain information incorporated into LOINC may be subject to third-party copyright or licensing requirements. Where applicable, such content remains subject to the relevant third-party terms and conditions. BloodLyn does not represent that Regenstrief Institute, Inc., the LOINC Committee, or any other third-party content provider endorses, sponsors, certifies, or is affiliated with BloodLyn.
              </p>
              <h4 className="font-bold text-foreground mt-4 text-sm">Ownership and Trademarks</h4>
              <p>
                LOINC® and RELMA® are registered trademarks of Regenstrief Institute, Inc. All rights in LOINC and its associated materials remain with their respective rights holders. BloodLyn is an independent platform and is not an official LOINC product, service, or application.
              </p>
              <h4 className="font-bold text-foreground mt-4 text-sm">Source and Version</h4>
              <p>
                LOINC content used by BloodLyn may be based on a particular LOINC release/version. Where applicable, BloodLyn may identify the relevant LOINC version in its application, documentation, or license information.
              </p>
              <p>
                For the complete LOINC license and terms of use, please refer to: <a href="https://loinc.org/license" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold">https://loinc.org/license</a>
              </p>
            </div>
          </motion.section>

          <section className="mt-4 p-5 rounded-3xl bg-card/98 border border-border/60 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)]">
            <h2 className="text-base font-bold text-foreground tracking-tight">Icon Credits</h2>
            <div className="text-[12px] text-muted-foreground leading-relaxed font-medium space-y-3 mt-3">
              <p>
                Some 3D icons in BloodLyn are from Fluent Emoji by Microsoft Corporation (<a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noreferrer" className="text-primary hover:underline">github.com/microsoft/fluentui-emoji</a>), used under the MIT License.
              </p>
              <p className="italic bg-muted/30 p-3 rounded-xl border border-border/50 text-[11px] leading-relaxed">
                Copyright © Microsoft Corporation. Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
              </p>
            </div>
          </section>
        </div>
      </div>
    </MobileLayout>
  );
};

export default DataAttributionScreen;
