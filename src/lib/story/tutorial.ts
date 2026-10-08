/** Whether the guided first crisis (新手教学) has been finished or skipped on this device. */
export const TUTORIAL_KEY = "leo-street-tutorial-v1";

export function readTutorialDone(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(TUTORIAL_KEY) === "done";
  } catch {
    return false;
  }
}

export function markTutorialDone() {
  try {
    localStorage.setItem(TUTORIAL_KEY, "done");
  } catch {
    /* unavailable: the banner simply shows again next time */
  }
}
