import test from "node:test";
import assert from "node:assert/strict";
import { addMinutes, overlaps } from "../lib/time.js";

test("detecta horarios que se solapan", () => {
  assert.equal(overlaps("09:00", 45, "09:30", 30), true);
  assert.equal(overlaps("09:00", 30, "09:30", 30), false);
  assert.equal(addMinutes("09:30", 45), "10:15");
});
