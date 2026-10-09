import { getPageItems } from "./Pagination";

describe("getPageItems", () => {
  it("shows all pages when few", () => {
    expect(getPageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("collapses the tail near the start", () => {
    expect(getPageItems(1, 20)).toEqual([1, 2, 3, 4, 5, "end-ellipsis", 20]);
  });
  it("collapses both sides in the middle", () => {
    expect(getPageItems(10, 20)).toEqual([1, "start-ellipsis", 9, 10, 11, "end-ellipsis", 20]);
  });
  it("collapses the head near the end", () => {
    expect(getPageItems(20, 20)).toEqual([1, "start-ellipsis", 16, 17, 18, 19, 20]);
  });
});
