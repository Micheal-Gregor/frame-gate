/**
 * The project's configuration, handed to the library's constructors. Data, not logic: which cells
 * exist, the draw classes in cost order, the declaration levels, the review components, and the
 * words a person reads for each id.
 */
export const PROJECT = {
  title: "Story 1 · Scene 3 - the kitchen argument",
  currencies: ["still", "i2v"],
  levels: ["easy", "hard"],
  components: ["identity", "composition"],
  units: {
    "mara-pkg": { package: "Mara" },
    "3.1": { shot: "wide", speaking: false },
    "3.2": { shot: "close-up", speaking: true },
    "3.3": { shot: "reaction", speaking: false },
  },
  labels: {
    "mara-pkg": "Mara - identity package",
    "3.1": "3.1 - wide",
    "3.2": "3.2 - Mara, close-up",
    "3.3": "3.3 - reaction",
  } as Readonly<Record<string, string>>,
  classLabels: { still: "still", i2v: "I2V clip" } as Readonly<Record<string, string>>,
} as const;
