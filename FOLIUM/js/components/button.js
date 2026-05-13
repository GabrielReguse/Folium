const Button = {
  create({
    label = "Botão",
    variant = "primary",
    size = "md",
    full = false,
    disabled = false,
    icon = "",
    onClick = null,
    className = "",
  } = {}) {
    const btn = document.createElement("button");

    const sizeClass = size === "md" ? "" : `btn-${size}`;
    btn.className = [
      "btn",
      `btn-${variant}`,
      sizeClass,
      full ? "btn-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    btn.innerHTML = icon ? `${icon} ${label}` : label;
    btn.disabled = disabled;

    if (onClick) btn.addEventListener("click", onClick);
    return btn;
  },

  primary(label, onClick, opts = {}) {
    return this.create({ label, onClick, variant: "primary", ...opts });
  },
  secondary(label, onClick, opts = {}) {
    return this.create({ label, onClick, variant: "secondary", ...opts });
  },
  ghost(label, onClick, opts = {}) {
    return this.create({ label, onClick, variant: "ghost", ...opts });
  },
  outline(label, onClick, opts = {}) {
    return this.create({ label, onClick, variant: "outline", ...opts });
  },

  setLoading(btn, loading, originalLabel = "") {
    if (loading) {
      btn._originalLabel = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="loader loader-w" style="width:16px;height:16px;border-width:2px"></span> Aguarde...`;
    } else {
      btn.disabled = false;
      btn.innerHTML = originalLabel || btn._originalLabel || btn.innerHTML;
    }
  },
};
