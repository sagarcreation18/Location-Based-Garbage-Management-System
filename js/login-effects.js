(() => {
  const fields = [...document.querySelectorAll(".login-form .field")];
  fields.forEach(field => {
    const input = field.querySelector("input");
    if (!input) return;
    const sync = () => {
      field.classList.toggle("is-complete", Boolean(input.value) && input.checkValidity());
      field.classList.toggle("has-value", Boolean(input.value));
    };
    input.addEventListener("focus", () => field.classList.add("is-focused"));
    input.addEventListener("blur", () => { field.classList.remove("is-focused"); sync(); });
    input.addEventListener("input", sync);
    sync();
  });
  document.querySelectorAll(".login-form").forEach(form => {
    form.addEventListener("submit", () => {
      if (form.checkValidity()) {
        form.classList.add("login-submitting");
        // A failed request should not leave the form locked.
        setTimeout(() => form.classList.remove("login-submitting"), 4000);
      } else {
        form.querySelectorAll(".field").forEach(field => {
          const input = field.querySelector("input");
          if (input && !input.checkValidity()) {
            field.classList.add("is-invalid-animated");
            setTimeout(() => field.classList.remove("is-invalid-animated"), 500);
          }
        });
      }
    });
    form.querySelectorAll("input").forEach(input => input.addEventListener("input", () => {
      input.closest(".field")?.classList.remove("is-invalid-animated");
    }));
  });
  document.querySelectorAll(".role").forEach(role => role.addEventListener("click", () => {
    role.animate([{ transform: "scale(.98)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
  }));
  document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
    tab.animate([{ transform: "translateY(2px) scale(.98)" }, { transform: "translateY(0) scale(1)" }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" });
  }));
})();
