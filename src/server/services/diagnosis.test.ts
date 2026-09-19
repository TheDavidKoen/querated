import { describe, expect, it, vi } from "vitest";
import { diagnose, type FilterParams, type SearchFilter } from "./diagnosis";

const department: SearchFilter = { arguments: ["departmentId"], params: { departmentId: 4 } };
const years: SearchFilter = {
  arguments: ["from", "to"],
  params: { dateBegin: 1400, dateEnd: 1600 },
};
const highlights: SearchFilter = { arguments: ["highlightsOnly"], params: { isHighlight: true } };

// A pretend collection: 10 works match the term, 3 are in department 4, 5 fall in the years,
// 2 are highlights, and no work is all three at once.
function counter() {
  return vi.fn(async (params: FilterParams) => {
    const applied = [
      params.departmentId !== undefined,
      params.dateBegin !== undefined,
      params.isHighlight === true,
    ];
    const key = applied.map(Number).join("");
    const totals: Record<string, number> = {
      "000": 10,
      "100": 3,
      "010": 5,
      "001": 2,
      "110": 1,
      "101": 0,
      "011": 2,
    };
    return totals[key] ?? 0;
  });
}

describe("diagnose", () => {
  it("counts each filter alone and each filter removed", async () => {
    const count = counter();
    const result = await diagnose([department, years, highlights], count);
    expect(result).toEqual({
      searchAlone: 10,
      filters: [
        { arguments: ["departmentId"], matchesAlone: 3, matchesWithout: 2 },
        { arguments: ["from", "to"], matchesAlone: 5, matchesWithout: 0 },
        { arguments: ["highlightsOnly"], matchesAlone: 2, matchesWithout: 1 },
      ],
    });
  });

  it("asks The Met once per distinct combination, and never for the one already empty", async () => {
    const count = counter();
    await diagnose([department, years, highlights], count);
    expect(count).toHaveBeenCalledTimes(7);
    expect(count).not.toHaveBeenCalledWith({
      ...department.params,
      ...years.params,
      ...highlights.params,
    });
  });

  it("needs only the unfiltered search when there is one filter", async () => {
    const count = counter();
    const result = await diagnose([department], count);
    expect(count).toHaveBeenCalledTimes(1);
    expect(result.filters).toEqual([
      { arguments: ["departmentId"], matchesAlone: 0, matchesWithout: 10 },
    ]);
  });

  it("makes no call when the search term alone found nothing", async () => {
    const count = counter();
    expect(await diagnose([], count)).toEqual({ searchAlone: 0, filters: [] });
    expect(count).not.toHaveBeenCalled();
  });
});
