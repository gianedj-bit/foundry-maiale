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

    html.on("change", "input, select", this._onFieldChange.bind(this));
    html.on("click", "button[data-action='rollAction']", this._onRollAction.bind(this));
    html.on("click", "button[data-action='rollGambit']", this._onRollGambit.bind(this));
    html.on("click", ".maiale-sheet__portrait", this._onEditPortrait.bind(this));
    html.on("click", ".maiale-sheet__token-config", this._onTokenConfig.bind(this));
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
    await roll.evaluate();

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
    const roll = new Roll(die);
    await roll.evaluate();

    const speaker = ChatMessage.getSpeaker({ actor: this.document });
    await roll.toMessage({
      speaker,
      flavor: `<strong>${this.document.name}</strong> rolls Gambit (${die})`,
      create: true,
    });
  }

  async _onEditPortrait(event) {
    event.preventDefault();
    const fp = new FilePicker({
      type: "image",
      callback: async (path) => {
        if (!path) return;
        const updates = { img: path };
        const proto = this.document.prototypeToken || {};
        const newProto = Object.assign({}, proto, { texture: { ...(proto.texture || {}), src: path } });
        updates.prototypeToken = newProto;
        await this.document.update(updates);
      },
    });
    fp.render(true);
  }

  async _onTokenConfig(event) {
    event.preventDefault();
    // Open prototype token config for this actor
    const config = new TokenConfig({ actor: this.document, isPrototype: true });
    await config.render(true);
  }
}
