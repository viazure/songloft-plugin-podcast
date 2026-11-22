/**
 * Pure helpers for the「添加订阅」card so cancel/close can be unit-tested
 * without a browser.
 */

export function isAddSubCardOpen(el) {
  if (!el) return false;
  if (el.hasAttribute && el.hasAttribute("hidden")) return false;
  if (el.classList && el.classList.contains("hidden")) return false;
  return true;
}

/**
 * Reset OPML import fields only — does not close the add-subscription card.
 * @param {{
 *   opmlText?: { value?: string },
 *   opmlFile?: { value?: string },
 *   opmlSummary?: { textContent?: string },
 *   importBtn?: { disabled?: boolean },
 * }} els
 * @param {{ opmlText?: any }} [pending]
 */
export function resetOpmlImport(els = {}, pending = null) {
  if (pending && typeof pending === "object") pending.opmlText = null;
  if (els.opmlText) els.opmlText.value = "";
  if (els.opmlFile) els.opmlFile.value = "";
  if (els.opmlSummary) els.opmlSummary.textContent = "";
  if (els.importBtn) els.importBtn.disabled = true;
  return { reset: true };
}

/**
 * @param {{
 *   card?: { setAttribute?: Function, removeAttribute?: Function, classList?: { toggle: Function } },
 *   feedUrl?: { value?: string },
 *   opmlText?: { value?: string },
 *   opmlFile?: { value?: string },
 *   opmlSummary?: { textContent?: string },
 *   importBtn?: { disabled?: boolean },
 * }} els
 * @param {{ opmlText?: any }} [pending]
 */
export function closeAddSubForm(els = {}, pending = null) {
  resetOpmlImport(els, pending);
  if (els.feedUrl) els.feedUrl.value = "";
  const card = els.card;
  if (card) {
    if (typeof card.setAttribute === "function") card.setAttribute("hidden", "");
    if (card.classList && typeof card.classList.toggle === "function") {
      card.classList.toggle("hidden", true);
    }
  }
  return { closed: true };
}

export function openAddSubForm(els = {}) {
  const card = els.card;
  if (card) {
    if (typeof card.removeAttribute === "function") card.removeAttribute("hidden");
    if (card.classList && typeof card.classList.toggle === "function") {
      card.classList.toggle("hidden", false);
    }
  }
  return { open: true };
}
