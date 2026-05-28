export class MaialeCharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      ability: new fields.StringField({ required: true, blank: true, initial: "" }),
      flaw: new fields.StringField({ required: true, blank: true, initial: "" }),
      cutaway: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
      gambit: new fields.StringField({ required: true, blank: false, initial: "d6" }),
    };
  }
}
