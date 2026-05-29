import { PAWActorCharacterData } from "./module/data-models.mjs";
import { PAWActorSheet } from "./module/sheets.mjs";

Hooks.once("init", async function () {
  console.log("Pig at a Wedding | System initialized");

  const actorModelKey = "pig-at-a-wedding.character";
  CONFIG.Actor.dataModels = CONFIG.Actor.dataModels ?? {};
  Object.assign(CONFIG.Actor.dataModels, {
    [actorModelKey]: PAWActorCharacterData,
    character: PAWActorCharacterData,
  });

  CONFIG.Actor.typeLabels = CONFIG.Actor.typeLabels || {};
  CONFIG.Actor.typeLabels.character = game.i18n.localize("TYPES.Actor.character") || "Character";

  Actors.registerSheet("pig-at-a-wedding", PAWActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Actor Sheet",
  });

  Hooks.on("preUpdateActor", (actor, changed, options, userId) => {
    if (actor.type !== "character") return;
    if (options?.allowCutawayIncrement) return;

    const requestingUser = game.users?.get(userId);
    if (requestingUser?.isGM) return;
    if (!foundry.utils.hasProperty(changed, "system.cutaway")) return;

    foundry.utils.unsetProperty(changed, "system.cutaway");
    if (changed.system && !Object.keys(changed.system).length) delete changed.system;
  });

  // Ensure newly created characters have a usable portrait and prototype token
  Hooks.on("createActor", async (actor, options, userId) => {
    try {
      if (actor.type !== "character") return;
      const defaultImg = "icons/svg/mystery-man.svg";
      const updates = {};
      if (!actor.img) updates.img = defaultImg;
      const proto = actor.prototypeToken || {};
      const protoHasImage = proto.texture?.src || proto.img;
      if (!protoHasImage) {
        updates.prototypeToken = Object.assign({}, proto, { texture: { src: actor.img || updates.img || defaultImg } });
      }
      if (Object.keys(updates).length) await actor.update(updates);
    } catch (err) {
      console.error("Actor | Error setting default token:", err);
    }
  });
});
