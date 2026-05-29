// Note: prefer Foundry's expandObject util where available (foundry.utils.expandObject).
const SYSTEM_ID = "pig-at-a-wedding";
const ACTOR_SHEET_TEMPLATE = `systems/${SYSTEM_ID}/templates/actor-sheet.hbs`;
const DEFAULT_LAYOUT = Object.freeze({ width: 720, height: 760 });
const EXPANDED_LAYOUT = Object.freeze({ width: 760, height: 820 });

export class PAWActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    actions: {
      rollAll: PAWActorSheet.#onRollAllAction,
      save: PAWActorSheet.#onSaveAction,
    },
    classes: ["actor", "sheet"],
    position: {
      width: DEFAULT_LAYOUT.width,
      height: DEFAULT_LAYOUT.height,
    },
    window: {
      title: "Character",
      icon: "fas fa-user",
      resizable: true,
    },
  };

  static PARTS = {
    main: {
      template: ACTOR_SHEET_TEMPLATE,
    },
  };

  static async #onRollAllAction(event) {
    event.preventDefault();
    return this._onRollAll(event);
  }

  static async #onSaveAction(event) {
    event.preventDefault();
    return this._onSave(event);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;

    context.system = actor.system;
    context.canEditCutaway = game.user?.isGM ?? false;
    context.showHateBonus = Number(actor.system.cutaway ?? 0) > 1;
    context.gambitOptions = [
      { value: "d4", label: "Low", selected: actor.system.gambit === "d4" },
      { value: "d6", label: "Basic", selected: actor.system.gambit === "d6" },
      { value: "d8", label: "High", selected: actor.system.gambit === "d8" },
      { value: "d10", label: "Highest", selected: actor.system.gambit === "d10" },
    ];

    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._syncWindowLayout(Boolean(context.showHateBonus));
  }

  _syncWindowLayout(showExpandedControls) {
    const layout = showExpandedControls ? EXPANDED_LAYOUT : DEFAULT_LAYOUT;
    const viewportWidth = Math.max(window.innerWidth - 64, 560);
    const viewportHeight = Math.max(window.innerHeight - 64, 560);
    const minWidth = Math.min(layout.width, viewportWidth);
    const minHeight = Math.min(layout.height, viewportHeight);
    const maxWidth = Math.min(960, viewportWidth);
    const maxHeight = Math.min(900, viewportHeight);

    if (this.element) {
      this.element.style.minWidth = `${minWidth}px`;
      this.element.style.maxWidth = `${maxWidth}px`;
      this.element.style.minHeight = `${minHeight}px`;
      this.element.style.maxHeight = `${maxHeight}px`;
    }

    const currentWidth = typeof this.position?.width === "number" ? this.position.width : minWidth;
    const currentHeight = typeof this.position?.height === "number" ? this.position.height : minHeight;
    const targetWidth = Math.min(Math.max(currentWidth, minWidth), maxWidth);
    const targetHeight = Math.min(Math.max(currentHeight, minHeight), maxHeight);

    if ((targetWidth !== currentWidth) || (targetHeight !== currentHeight)) {
      this.setPosition({ width: targetWidth, height: targetHeight });
    }
  }

  _getSheetRoot() {
    return this.element?.querySelector(".actor-sheet") ?? this.element;
  }

  _castFieldValue(field, rawValue) {
    if (field.type === "checkbox") return field.checked;
    if ((field.dataset?.dtype === "Boolean") || ((field.type === "radio") && ((rawValue === "true") || (rawValue === "false")))) {
      return rawValue === "true";
    }
    if ((field.type === "number") || (field.dataset?.dtype === "Number")) {
      return rawValue === "" ? 0 : Number(rawValue);
    }
    return rawValue;
  }

  _collectFlatData() {
    const root = this._getSheetRoot();
    if (!root?.querySelectorAll) return {};

    const flat = {};
    const fields = root.querySelectorAll("input[name], select[name], textarea[name]");
    for (const field of fields) {
      const name = field.name;
      if (!name || field.disabled) continue;

      if (field.type === "radio") {
        if (!field.checked) continue;
        flat[name] = this._castFieldValue(field, field.value);
        continue;
      }

      flat[name] = this._castFieldValue(field, field.value);
    }

    return flat;
  }

  _collectSubmitData() {
    const flat = this._collectFlatData();
    return foundry?.utils?.expandObject ? foundry.utils.expandObject(flat) : flat;
  }

  _getCurrentValue(path, fallback) {
    const flat = this._collectFlatData();
    return Object.hasOwn(flat, path) ? flat[path] : fallback;
  }

  async _onSave(event) {
    console.log("Actor | _onSave", this.document?.id, this.document?.name);
    try {
      const submitData = this._collectSubmitData();
      if (!game.user?.isGM) {
        foundry.utils.unsetProperty?.(submitData, "system.cutaway");
        if (submitData.system && !Object.keys(submitData.system).length) delete submitData.system;
      }
      console.log("Actor | save data:", submitData);
      await this.document.update(submitData);
      ui.notifications?.info("Sheet saved");
    } catch (err) {
      console.error("Actor | save failed", err);
      ui.notifications?.error("Failed to save sheet");
    }
  }

  async _rollAction() {
    const abilityBonusEnabled = this._getCurrentValue("system.abilityBonus", this.document.system.abilityBonus ?? false);
    const hateBonusAvailable = Number(this.document.system.cutaway ?? 0) > 1;
    const hateBonusEnabled = hateBonusAvailable && this._getCurrentValue("system.hateBonus", this.document.system.hateBonus ?? false);
    const abilityBonus = abilityBonusEnabled ? 3 : 0;
    const hateBonus = hateBonusEnabled ? 2 : 0;
    const totalBonus = abilityBonus + hateBonus;
    const formula = totalBonus ? `1d20 + ${totalBonus}` : "1d20";

    console.log("Actor | _rollAction", this.document?.id, this.document?.name, { abilityBonusEnabled, hateBonusEnabled, hateBonusAvailable });
    try {
      const roll = new Roll(formula);
      await roll.evaluate();

      const speaker = ChatMessage.getSpeaker({ actor: this.document });
      const bonusParts = [];
      if (abilityBonusEnabled) bonusParts.push("ability bonus +3");
      if (hateBonusEnabled) bonusParts.push("hate bonus +2");
      const flavor = bonusParts.length
        ? `<strong>${this.document.name}</strong> rolls Action (d20 + ${bonusParts.join(" + ")})`
        : `<strong>${this.document.name}</strong> rolls Action (d20)`;
      try {
        await roll.toMessage({ speaker, flavor, create: true });
      } catch (err) {
        console.warn("Actor | roll.toMessage failed, falling back to ChatMessage.create", err);
        await ChatMessage.create({ speaker, content: `${flavor}: <strong>${roll.total}</strong>` });
      }

      const failureThreshold = 10;
      if (roll.total <= failureThreshold) {
        const nextCutaway = Number(this.document.system.cutaway || 0) + 1;
        await this.document.update({ system: { cutaway: nextCutaway } }, { allowCutawayIncrement: true });

        await ChatMessage.create({ speaker, content: `<p><strong>${this.document.name}</strong> failed the action. Cutaway failures increased to <strong>${nextCutaway}</strong>.</p>` });
      }
    } catch (err) {
      console.error("Actor | _onRollAction error", err);
      ui.notifications?.error("Action roll failed");
    }
  }

  async _rollGambit() {
    const die = this._getCurrentValue("system.gambit", this.document.system.gambit || "d6");
    console.log("Actor | _rollGambit", this.document?.id, this.document?.name, die);
    try {
      const expr = die.startsWith("d") ? `1${die}` : die;
      const roll = new Roll(expr);
      await roll.evaluate();

      const speaker = ChatMessage.getSpeaker({ actor: this.document });
      try {
        await roll.toMessage({ speaker, flavor: `<strong>${this.document.name}</strong> rolls Gambit Difficulty (${die})`, create: true });
      } catch (err) {
        console.warn("Actor | gambit roll.toMessage failed, falling back", err);
        await ChatMessage.create({ speaker, content: `<strong>${this.document.name}</strong> rolls Gambit Difficulty (${die}): <strong>${roll.total}</strong>` });
      }
    } catch (err) {
      console.error("Actor | _onRollGambit error", err);
      ui.notifications?.error("Gambit roll failed");
    }
  }

  async _onRollAll(event) {
    console.log("Actor | _onRollAll", this.document?.id, this.document?.name);
    try {
      await this._rollAction();
      await this._rollGambit();
    } catch (err) {
      console.error("Actor | _onRollAll error", err);
      ui.notifications?.error("Roll failed");
    }
  }
}
