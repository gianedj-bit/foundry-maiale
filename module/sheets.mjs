// Note: prefer Foundry's expandObject util where available (foundry.utils.expandObject).

export class MaialeActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    actions: {
      editPortrait: MaialeActorSheet.#onEditPortraitAction,
      rollAction: MaialeActorSheet.#onRollActionAction,
      rollGambit: MaialeActorSheet.#onRollGambitAction,
    },
    classes: ["maiale", "sheet", "actor", "standard-form"],
    form: {
      closeOnSubmit: false,
      submitOnChange: false,
    },
    position: {
      width: 600,
      height: 620,
    },
    window: {
      contentTag: "form",
      title: "Personaggio",
      icon: "fas fa-user",
    },
  };

  static PARTS = {
    main: {
      template: "systems/maiale-a-un-matrimonio/templates/actor-sheet.hbs",
    },
  };

  static async #onEditPortraitAction(event) {
    event.preventDefault();
    return this._onEditPortrait(event);
  }

  static async #onRollActionAction(event) {
    event.preventDefault();
    return this._onRollAction(event);
  }

  static async #onRollGambitAction(event) {
    event.preventDefault();
    return this._onRollGambit(event);
  }

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

  async _onRollAction(event) {
    console.log("Maiale | _onRollAction", this.document?.id, this.document?.name);
    try {
      const roll = new Roll("1d20");
      await roll.evaluate({ async: true });

      const speaker = ChatMessage.getSpeaker({ actor: this.document });
      try {
        await roll.toMessage({ speaker, flavor: `<strong>${this.document.name}</strong> rolls Action (d20)`, create: true });
      } catch (err) {
        console.warn("Maiale | roll.toMessage failed, falling back to ChatMessage.create", err);
        await ChatMessage.create({ speaker, content: `<strong>${this.document.name}</strong> rolls Action (d20): <strong>${roll.total}</strong>` });
      }

      const failureThreshold = 10;
      if (roll.total <= failureThreshold) {
        const nextCutaway = Number(this.document.system.cutaway || 0) + 1;
        await this.document.update({ system: { cutaway: nextCutaway } });

        await ChatMessage.create({ speaker, content: `<p><strong>${this.document.name}</strong> failed the action. Cutaway failures increased to <strong>${nextCutaway}</strong>.</p>` });
      }
    } catch (err) {
      console.error("Maiale | _onRollAction error", err);
      ui.notifications?.error("Errore nel lancio del dado");
    }
  }

  async _onRollGambit(event) {
    console.log("Maiale | _onRollGambit", this.document?.id, this.document?.name, this.document?.system?.gambit);
    try {
      const die = this.document.system.gambit || "d6";
      const expr = die.startsWith("d") ? `1${die}` : die;
      const roll = new Roll(expr);
      await roll.evaluate({ async: true });

      const speaker = ChatMessage.getSpeaker({ actor: this.document });
      try {
        await roll.toMessage({ speaker, flavor: `<strong>${this.document.name}</strong> rolls Gambit (${die})`, create: true });
      } catch (err) {
        console.warn("Maiale | gambit roll.toMessage failed, falling back", err);
        await ChatMessage.create({ speaker, content: `<strong>${this.document.name}</strong> rolls Gambit (${die}): <strong>${roll.total}</strong>` });
      }
    } catch (err) {
      console.error("Maiale | _onRollGambit error", err);
      ui.notifications?.error("Errore nel lancio del dado gambit");
    }
  }

  async _onEditPortrait(event) {
    console.log("Maiale | _onEditPortrait invoked for", this.document?.id, this.document?.name);
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

  // Let DocumentSheetV2's form handling perform the actual update. We override
  // _processSubmitData to log and show a notification after the builtin update.
  async _processSubmitData(event, form, submitData, options) {
    try {
      console.log("Maiale | submit data:", submitData);
      await super._processSubmitData(event, form, submitData, options);
      ui.notifications?.info("Scheda salvata");
    } catch (err) {
      console.error("Maiale | submit failed", err);
      ui.notifications?.error("Errore nel salvataggio della scheda");
    }
  }
}
