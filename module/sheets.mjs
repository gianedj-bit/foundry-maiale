// Utility: expand flat keys like "system.ability" into nested objects { system: { ability: value } }
function _expandObject(flat) {
  const out = {};
  for (const key of Object.keys(flat)) {
    const value = flat[key];
    const parts = key.split(".");
    let cur = out;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === parts.length - 1) {
        cur[p] = value;
      } else {
        cur[p] = cur[p] || {};
        cur = cur[p];
      }
    }
  }
  return out;
}

export class MaialeActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["maiale", "sheet", "actor"],
    position: {
      width: 600,
      height: 620,
    },
    window: {
      title: "Personaggio",
      icon: "fas fa-user",
    },
  };

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, this.DEFAULT_OPTIONS);
  }

  static PARTS = {
    main: {
      template: "systems/maiale-a-un-matrimonio/templates/actor-sheet.hbs",
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;

    context.system = actor.system;
    context.gambitOptions = [
      { value: "d4", label: "Low", selected: actor.system.gambit === "d4" },
      { value: "d6", label: "Basic", selected: actor.system.gambit === "d6" },
      { value: "d8", label: "High", selected: actor.system.gambit === "d8" },
      { value: "d10", label: "Highest", selected: actor.system.gambit === "d10" },
    ];

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.on("click", "button[data-action='save']", this._onSave.bind(this));
    html.on("click", "button[data-action='rollAction']", this._onRollAction.bind(this));
    html.on("click", "button[data-action='rollGambit']", this._onRollGambit.bind(this));
    html.on("click", ".maiale-sheet__portrait", this._onEditPortrait.bind(this));
  }

  async _onFieldChange(event) {
    const target = event.currentTarget;
    const field = target.name;
    if (!field) return;

    const value = target.type === "number" ? Number(target.value) : target.value;
    await this.document.update({ [field]: value });
  }

  async _onRollAction(event) {
    event.preventDefault();

    const roll = new Roll("1d20");
    await roll.evaluate({ async: true });

    const speaker = ChatMessage.getSpeaker({ actor: this.document });
    await roll.toMessage({
      speaker,
      flavor: `<strong>${this.document.name}</strong> rolls Action (d20)`,
      create: true,
    });

    const failureThreshold = 10;
    if (roll.total <= failureThreshold) {
      const nextCutaway = Number(this.document.system.cutaway || 0) + 1;
      await this.document.update({ "system.cutaway": nextCutaway });

      await ChatMessage.create({
        speaker,
        content: `<p><strong>${this.document.name}</strong> failed the action. Cutaway failures increased to <strong>${nextCutaway}</strong>.</p>`,
      });
    }
  }

  async _onRollGambit(event) {
    event.preventDefault();

    const die = this.document.system.gambit || "d6";
    const expr = die.startsWith("d") ? `1${die}` : die;
    const roll = new Roll(expr);
    await roll.evaluate({ async: true });

    const speaker = ChatMessage.getSpeaker({ actor: this.document });
    await roll.toMessage({
      speaker,
      flavor: `<strong>${this.document.name}</strong> rolls Gambit (${die})`,
      create: true,
    });
  }

  async _onEditPortrait(event) {
    event.preventDefault();
    // Try multiple constructor patterns for TokenConfig so third-party modules
    // (e.g., Tokenizer) that hook TokenConfig rendering can intercept correctly.
    try {
      // Pattern 1: TokenConfig(actor, { isPrototype: true })
      if (typeof TokenConfig === "function") {
        try {
          const cfg = new TokenConfig(this.document, { isPrototype: true });
          await cfg.render(true);
          return;
        } catch (err) {
          // ignore and try next
        }
        try {
          const cfg = new TokenConfig({ actor: this.document, isPrototype: true });
          await cfg.render(true);
          return;
        } catch (err) {
          // ignore and try next
        }
      }
      // Pattern 2: foundry.applications.sheets.TokenConfig
      const Tc = foundry?.applications?.sheets?.TokenConfig;
      if (Tc) {
        try {
          const cfg = new Tc(this.document, { isPrototype: true });
          await cfg.render(true);
          return;
        } catch (err) {
          try {
            const cfg = new Tc({ actor: this.document, isPrototype: true });
            await cfg.render(true);
            return;
          } catch (err2) {
            // nothing
          }
        }
      }
      ui.notifications?.warn("Token configuration UI non disponibile");
    } catch (err) {
      console.error("Maiale | _onEditPortrait error", err);
      ui.notifications?.error("Impossibile aprire la configurazione del token");
    }
  }

  async _onSave(event) {
    event.preventDefault();
    const form = this.element.querySelector("form");
    if (!form) return;
    const formData = new FormData(form);
    const flat = {};
    for (const [name, value] of formData.entries()) {
      const fieldEl = form.querySelector(`[name="${name}"]`);
      let val = value;
      if (fieldEl?.type === "number") val = Number(value);
      if (fieldEl?.type === "checkbox") val = fieldEl.checked;
      flat[name] = val;
    }
    const nested = _expandObject(flat);
    try {
      console.log("Maiale | saving:", nested);
      await this.document.update(nested);
      ui.notifications?.info("Scheda salvata");
    } catch (err) {
      console.error("Maiale | Save failed:", err);
      ui.notifications?.error("Errore nel salvataggio della scheda");
    }
  }
}
