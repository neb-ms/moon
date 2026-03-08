const INSTALL_PROMPT_DISMISSED_KEY = "project-lunar/install-prompt-dismissed";

function hasDismissedInstallPrompt(): boolean {
  return window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "true";
}

function setDismissedInstallPrompt(dismissed: boolean): void {
  if (dismissed) {
    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
    return;
  }

  window.localStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
}

export { INSTALL_PROMPT_DISMISSED_KEY, hasDismissedInstallPrompt, setDismissedInstallPrompt };
