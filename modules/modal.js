export function setupModal({ modal, closeButton, tabButtons, tabPanels, copyButtons, onBeforeClose }) {
  function open() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function requestClose(reason) {
    if (typeof onBeforeClose === "function") {
      const allowClose = onBeforeClose(reason);
      if (allowClose === false) {
        return;
      }
    }
    close();
  }

  closeButton.addEventListener("click", () => requestClose("button"));

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      requestClose("backdrop");
    }
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      tabButtons.forEach((item) => item.classList.toggle("active", item === button));
      tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === target));
    });
  });

  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      if (!target) {
        return;
      }
      try {
        await navigator.clipboard.writeText(target.textContent || "");
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 800);
      } catch (error) {
        button.textContent = "Copy failed";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 800);
      }
    });
  });

  return { open, close, requestClose };
}
