import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, FlaskConical, IndianRupee, Clock, FileText } from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { Badge } from "@/components/ui/badge";
import { useBridgeTests } from "@/hooks/useBridgeTests";
import { useMemo } from "react";

const CategoryTestsScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get("slug") || "";
  const categoryName = searchParams.get("name") || "Tests";

  const { data: bridgeData, isLoading, error } = useBridgeTests();

  const tests = useMemo(() => {
    if (!bridgeData?.tests) return [];
    return bridgeData.tests.filter((t) => t.category === categorySlug);
  }, [bridgeData, categorySlug]);

  const handleTestClick = (test: typeof tests[0]) => {
    navigate("/test/select", {
      state: {
        test: {
          id: test.id,
          name: test.test_name,
          price: test.price || test.collection_fee || 0,
          original_price: null,
          discount_percent: null,
          report_time_hours: test.report_delivery_time ? parseInt(test.report_delivery_time) || null : null,
          sample_type: "Blood",
        },
      },
    });
  };

  return (
    <MobileLayout>
      <ScreenHeader title={categoryName} />

      <div className="px-4 mt-4 pb-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load tests</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No tests available in this category yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleTestClick(test)}
                className="soft-card cursor-pointer transition-all hover:border-primary/30"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FlaskConical className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">{test.test_name}</h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {(test.price > 0 || test.collection_fee > 0) && (
                        <span className="flex items-center gap-0.5">
                          <IndianRupee className="w-3 h-3" />
                          {test.price > 0 ? test.price : test.collection_fee}
                        </span>
                      )}
                      {test.report_delivery_time && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {test.report_delivery_time}h report
                        </span>
                      )}
                    </div>
                    {test.prerequisites && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {test.prerequisites}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    Book
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default CategoryTestsScreen;
