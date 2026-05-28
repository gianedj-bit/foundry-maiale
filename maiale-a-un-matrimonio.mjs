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
});
