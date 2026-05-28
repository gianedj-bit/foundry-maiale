import { MaialeCharacterData } from "./module/data-models.mjs";
import { MaialeActorSheet } from "./module/sheets.mjs";

Hooks.once("init", async function () {
  console.log("Maiale a un matrimonio | Sistema inizializzato");

  CONFIG.Actor.dataModels = {
    character: MaialeCharacterData,
  };

  CONFIG.Actor.typeLabels = CONFIG.Actor.typeLabels || {};
  CONFIG.Actor.typeLabels.character = "Personaggio";

  Actors.registerSheet("maiale-a-un-matrimonio", MaialeActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Maiale Sheet",
  });
});
