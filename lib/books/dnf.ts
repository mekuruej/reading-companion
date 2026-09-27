export const DNF_REASON_OPTIONS = [
  { value: "", label: "Choose a reason" },
  { value: "too_difficult_right_now", label: "Too difficult right now" },
  { value: "wrong_timing_mood", label: "Wrong timing or mood" },
  { value: "too_much_unknown_vocabulary", label: "Too much unknown vocabulary" },
  { value: "too_dense_slow", label: "Too dense or slow" },
  { value: "lost_interest", label: "Lost interest" },
  { value: "did_not_like_it", label: "Did not like it" },
  { value: "other", label: "Other" },
];

export type DnfDetails = { reason: string; note: string };
