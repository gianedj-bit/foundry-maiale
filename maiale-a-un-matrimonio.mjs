import { MaialeCharacterData } from "./module/data-models.mjs";
import { MaialeActorSheet } from "./module/sheets.mjs";

Hooks.once("init", async function () {
  console.log("Maiale a un matrimonio | Sistema inizializzato");

  const actorModelKey = "maiale-a-un-matrimonio.character";
  CONFIG.Actor.dataModels = CONFIG.Actor.dataModels ?? {};
  Object.assign(CONFIG.Actor.dataModels, {
    [actorModelKey]: MaialeCharacterData,
    character: MaialeCharacterData,
  });

  CONFIG.Actor.typeLabels = CONFIG.Actor.typeLabels || {};
  CONFIG.Actor.typeLabels.character = game.i18n.localize("TYPES.Actor.character") || "Personaggio";

  Actors.registerSheet("maiale-a-un-matrimonio", MaialeActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Maiale Sheet",
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
      console.error("Maiale | Error setting default token:", err);
    }
  });
});
