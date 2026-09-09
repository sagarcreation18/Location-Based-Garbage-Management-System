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
  document.querySelectorAll(".login-form").forEach(form => form.addEventListener("submit", () => {
    if (form.checkValidity()) form.classList.add("login-submitting");
  }));
  document.querySelectorAll(".role").forEach(role => role.addEventListener("click", () => {
    role.animate([{ transform: "scale(.98)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
  }));
})();
