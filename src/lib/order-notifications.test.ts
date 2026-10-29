import { describe, it, expect, beforeEach } from "vitest";
import { orderStatusNotification, shouldNotifyStatus } from "./order-notifications";

describe("orderStatusNotification", () => {
  it("names the phlebotomist the lab assigned", () => {
    const n = orderStatusNotification({ status: "partner_assigned", delivery_partner_name: "Rahul Das", delivery_partner_phone: "9876543210" });
    expect(n?.title).toBe("Phlebotomist assigned 🩺");
    expect(n?.message).toContain("Rahul Das will collect your sample (9876543210)");
  });

  it("still notifies when the name is missing", () => {
    expect(orderStatusNotification({ status: "partner_assigned" })?.message).toContain("A phlebotomist has been assigned");
  });

  it("covers every status the Partner portal sends, without raw status codes", () => {
    for (const status of ["accepted", "partner_assigned", "collection_pending", "sample_collected", "processing", "report_ready", "completed", "cancelled"]) {
      const n = orderStatusNotification({ status });
      expect(n, status).not.toBeNull();
      expect(`${n?.title} ${n?.message}`).not.toContain(status.includes("_") ? status : "status is now");
    }
  });

  it("stays quiet for statuses customers don't need", () => {
    expect(orderStatusNotification({ status: "pending" })).toBeNull();
    expect(orderStatusNotification({ status: "something_new" })).toBeNull();
  });
});

describe("shouldNotifyStatus", () => {
  beforeEach(() => localStorage.clear());

  it("notifies once per order and status, however often the row changes", () => {
    expect(shouldNotifyStatus("o1", "partner_assigned")).toBe(true);
    expect(shouldNotifyStatus("o1", "partner_assigned")).toBe(false); // e.g. phone number edited
    expect(shouldNotifyStatus("o1", "sample_collected")).toBe(true);
    expect(shouldNotifyStatus("o2", "partner_assigned")).toBe(true);
  });
});
