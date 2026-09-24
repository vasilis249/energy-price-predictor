import { describe, expect, it } from "vitest";
import { parsePlantForm } from "./plant";

const pv = { name: "Kozani PV", plantType: "pv", capacityMw: "4.99", supportScheme: "fip" };
const biogas = {
  name: "Larissa Biogas",
  plantType: "biogas",
  capacityMw: "1,5",
  supportScheme: "fip",
  avgProductionMw: "1,0",
  gasStorageHours: "8",
  minLoadPct: "40",
  maxLoadMw: "1.5",
  maxStartsPerDay: "2",
  rampMwPerHour: "",
  minUpHours: "2",
  minDownHours: "1",
};

describe("parsePlantForm", () => {
  it("accepts a minimal PV plant and ignores biogas fields", () => {
    const result = parsePlantForm({ ...pv, gasStorageHours: "garbage" });
    expect(result).toEqual({
      success: true,
      plant: { name: "Kozani PV", plantType: "pv", capacityMw: 4.99, supportScheme: "fip" },
      biogas: null,
    });
  });

  it("parses Greek decimal commas and treats blank optional numbers as missing", () => {
    const result = parsePlantForm(biogas);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.plant.capacityMw).toBe(1.5);
    expect(result.biogas).toMatchObject({ avgProductionMw: 1, maxLoadMw: 1.5, maxStartsPerDay: 2 });
    expect(result.biogas?.rampMwPerHour).toBeUndefined();
  });

  it("requires biogas parameters for biogas plants", () => {
    const result = parsePlantForm({ ...pv, plantType: "biogas" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors).toMatchObject({
      avgProductionMw: "required",
      gasStorageHours: "required",
      maxStartsPerDay: "required",
    });
  });

  it("returns i18n keys for invalid values", () => {
    const result = parsePlantForm({
      ...pv,
      name: "  ",
      capacityMw: "abc",
      plantType: "coal",
      latitude: "50",
      longitude: "22",
    });
    expect(result).toEqual({
      success: false,
      fieldErrors: { name: "required", capacityMw: "invalidNumber", plantType: "required", latitude: "outOfRange" },
    });
  });

  it("rejects zero or negative capacity", () => {
    const result = parsePlantForm({ ...pv, capacityMw: "0" });
    expect(result).toMatchObject({ success: false, fieldErrors: { capacityMw: "outOfRange" } });
  });

  it("requires latitude and longitude together", () => {
    const result = parsePlantForm({ ...pv, latitude: "39.6" });
    expect(result).toMatchObject({ success: false, fieldErrors: { longitude: "coordinatesPair" } });
  });

  it("checks biogas cross-field constraints", () => {
    expect(parsePlantForm({ ...biogas, maxLoadMw: "2" })).toMatchObject({
      success: false,
      fieldErrors: { maxLoadMw: "maxLoadExceedsCapacity" },
    });
    expect(parsePlantForm({ ...biogas, avgProductionMw: "1.6" })).toMatchObject({
      success: false,
      fieldErrors: { avgProductionMw: "avgExceedsMaxLoad" },
    });
  });

  it("rejects fractional start counts and out-of-range storage", () => {
    expect(parsePlantForm({ ...biogas, maxStartsPerDay: "1.5", gasStorageHours: "100" })).toMatchObject({
      success: false,
      fieldErrors: { maxStartsPerDay: "invalidNumber", gasStorageHours: "outOfRange" },
    });
  });
});
