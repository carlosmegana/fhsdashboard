import assert from "node:assert/strict";
import {
  addDays, addMonths, windowStart, levelOf, habitWindows, dailyCalendar, streak, doneRate,
  tasksPerWeek, monthsBack, recentRate, zoneSeries, latestAndDelta, mostNeglected, sparkline, goalsByQuarter,
  type HabitLog,
} from "../src/lib/history.ts";

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log("ok -", name); };
const log = (day: string, completed = true, progress = 0, target: number | null = null): HabitLog =>
  ({ habit_id: "h", day, completed, progress, target });

t("calendar arithmetic across month and year ends", () => {
  assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29"); // leap year
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-01");
  assert.equal(addMonths("2026-01-15", -1), "2025-12-01");
});

t("week starts on Monday, including when today is Sunday", () => {
  assert.equal(windowStart("weekly", "2026-10-01"), "2026-09-28"); // Thursday
  assert.equal(windowStart("weekly", "2026-10-04"), "2026-09-28"); // Sunday
  assert.equal(windowStart("weekly", "2026-09-28"), "2026-09-28"); // Monday
  assert.equal(windowStart("weekly", "2027-01-01"), "2026-12-28"); // across a year
  assert.equal(windowStart("monthly", "2026-10-17"), "2026-10-01");
});

t("level: checkbox and measurable, using the target at the time", () => {
  assert.equal(levelOf(undefined), 0);
  assert.equal(levelOf(log("d", true)), 3);
  assert.equal(levelOf(log("d", false)), 0);
  assert.equal(levelOf(log("d", true, 10, 30)), 1);
  assert.equal(levelOf(log("d", true, 15, 30)), 2);
  assert.equal(levelOf(log("d", true, 30, 30)), 3);
  assert.equal(levelOf(log("d", true, 45, 30)), 3); // overshoot
  assert.equal(levelOf(log("d", false, 0, 30)), 0);
});

t("daily streak: an unticked today does not break it", () => {
  const logs = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"].map((d) => log(d));
  assert.equal(streak(logs, "daily", "2026-10-01", "2026-09-01"), 4);
  assert.equal(streak([...logs, log("2026-10-01")], "daily", "2026-10-01", "2026-09-01"), 5);
});

t("daily streak: a gap breaks it, an unticked entry counts as a gap", () => {
  const logs = [log("2026-09-28"), log("2026-09-29", false), log("2026-09-30")];
  assert.equal(streak(logs, "daily", "2026-10-01", "2026-09-01"), 1);
});

t("streak never reaches back before recording began", () => {
  const logs = [log("2026-09-30")];
  assert.equal(streak(logs, "daily", "2026-10-01", "2026-09-30"), 1);
  assert.equal(streak([], "daily", "2026-10-01", "2026-10-01"), 0);
});

t("weekly streak uses the latest entry of each week (running total)", () => {
  // Week of 14 Sep done, week of 21 Sep: ticked Tue then unticked Thu -> not done.
  const logs = [log("2026-09-15"), log("2026-09-22"), log("2026-09-24", false), log("2026-09-29")];
  assert.equal(streak(logs, "weekly", "2026-10-01", "2026-09-01"), 1); // only this week
  const ok = [log("2026-09-15"), log("2026-09-22"), log("2026-09-29")];
  assert.equal(streak(ok, "weekly", "2026-10-01", "2026-09-01"), 3);
});

t("monthly windows and streak", () => {
  const logs = [log("2026-08-03"), log("2026-09-12")];
  assert.equal(streak(logs, "monthly", "2026-10-01", "2026-07-01"), 2); // Oct not done yet
  const w = habitWindows(logs, "monthly", "2026-10-01", 4, "2026-08-01");
  assert.deepEqual(w.map((c) => c.start), ["2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"]);
  assert.deepEqual(w.map((c) => c.level), [null, 3, 3, 0]); // July predates recording
});

t("calendar: shape, future days, and no-data days", () => {
  const cal = dailyCalendar([log("2026-09-30"), log("2026-10-01")], "2026-10-01", 2, "2026-09-25");
  assert.equal(cal.length, 2);
  assert.ok(cal.every((c) => c.length === 7));
  assert.equal(cal[0][0].start, "2026-09-21");
  assert.equal(cal[1][6].start, "2026-10-04");
  assert.equal(cal[0][0].level, null);           // before recording
  assert.equal(cal[0][4].level, 0);              // 25 Sep: recorded, not done
  assert.equal(cal[1][2].level, 3);              // 30 Sep
  assert.equal(cal[1][4].future, true);          // 2 Oct
  const r = doneRate(cal.flat());
  assert.deepEqual(r, { done: 2, total: 7 });    // 25 Sep .. 1 Oct
});

t("tasks per week bucket by local week, ignoring older ones", () => {
  const w = tasksPerWeek(
    ["2026-09-29T10:00:00", "2026-09-30T23:30:00", "2026-09-22T09:00:00", "2026-01-01T09:00:00"],
    "2026-10-01", 3);
  assert.deepEqual(w.map((x) => [x.start, x.count, x.current]),
    [["2026-09-14", 0, false], ["2026-09-21", 1, false], ["2026-09-28", 2, true]]);
});

t("zones: months, series with gaps, deltas and the most neglected", () => {
  const months = monthsBack("2026-10-01", 6);
  assert.deepEqual(months, ["2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"]);
  const scores = [
    { zone_id: "a", month: "2026-06-01", score: 7 }, { zone_id: "a", month: "2026-09-01", score: 3 },
    { zone_id: "b", month: "2026-06-01", score: 5 }, { zone_id: "b", month: "2026-09-01", score: 6 },
  ];
  const a = zoneSeries(scores, "a", months);
  assert.deepEqual(a, [null, 7, null, null, 3, null]);
  assert.deepEqual(latestAndDelta(a), { latest: 3, delta: -4 }); // Sep vs Jun
  const b = latestAndDelta(zoneSeries(scores, "b", months));
  assert.equal(mostNeglected([latestAndDelta(a).delta, b.delta]), 0);
  assert.equal(mostNeglected([1, null, 0]), -1);
});

t("sparkline breaks at gaps instead of drawing zero", () => {
  const s = sparkline([5, null, 7, 8], 100, 40);
  assert.equal(s.segments.length, 2);
  assert.ok(s.end && s.end.x > 90);
  assert.equal(sparkline([null, null], 100, 40).end, null);
});

t("goals by quarter: resolved by when, open in the current quarter", () => {
  const g = (id: string, status: "open" | "done" | "dropped", at: string | null, archived: string | null = null) =>
    ({ id, text: id, category: "quarter_goals", status, status_at: at, archived_at: archived });
  const cols = goalsByQuarter([
    g("q1done", "done", "2026-02-10T12:00:00"),
    g("q3drop", "dropped", "2026-08-01T12:00:00"),
    g("open", "open", null),
    g("openArchived", "open", null, "2026-09-01T00:00:00"),
    g("lastYear", "done", "2025-11-01T12:00:00"),
  ], "2026-10-01");
  assert.deepEqual(cols.map((c) => c.goals.map((x) => x.id)), [["q1done"], [], ["q3drop"], ["open"]]);
  assert.deepEqual(cols.map((c) => c.current), [false, false, false, true]);
});

t("recent rate: an unfinished today is not counted as a miss", () => {
  const logs = [log("2026-09-29"), log("2026-09-30")];
  const cells = habitWindows(logs, "daily", "2026-10-01", 3, "2026-09-01");
  assert.deepEqual(recentRate(cells), { done: 2, total: 2 });       // today open
  const withToday = habitWindows([...logs, log("2026-10-01")], "daily", "2026-10-01", 3, "2026-09-01");
  assert.deepEqual(recentRate(withToday), { done: 3, total: 3 });
  const miss = habitWindows([log("2026-09-30")], "daily", "2026-10-01", 3, "2026-09-01");
  assert.deepEqual(recentRate(miss), { done: 1, total: 2 });        // 29 Sep missed
});

console.log(`\n${n} checks passed`);
