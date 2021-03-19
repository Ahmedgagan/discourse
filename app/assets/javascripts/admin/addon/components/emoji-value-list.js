import Component from "@ember/component";
import I18n from "I18n";
import { on } from "discourse-common/utils/decorators";
import { emojiUrlFor } from "discourse/lib/text";
import { action, set } from "@ember/object";
import { later, schedule } from "@ember/runloop";

export default Component.extend({
  classNameBindings: [":value-list"],
  collection: null,
  values: null,
  validationMessage: null,
  emojiPickerIsActive: false,
  isEditorFocused: false,
  emojiName: null,

  init() {
    this._super(...arguments);
    this.set("collection", []);
  },

  @action
  emojiSelected(code) {
    this.set("emojiName", code);
    this.set("emojiPickerIsActive", !this.emojiPickerIsActive);
    this.set("isEditorFocused", !this.isEditorFocused);
  },

  @action
  openEmojiPicker() {
    this.set("isEditorFocused", !this.isEditorFocused);
    later(() => {
      this.set("emojiPickerIsActive", !this.emojiPickerIsActive);
    }, 100);
  },

  @action
  clearInput() {
    this.set("emojiName", null);
  },

  @on("didReceiveAttrs")
  _setupCollection() {
    this.set("collection", this._splitValues(this.values));
  },

  _splitValues(values) {
    if (values && values.length) {
      const emojiList = [];
      const emojis = values.split("|").filter(Boolean);
      emojis.forEach((emojiName, index) => {
        const emoji = { isEditable: true, isEditing: false };
        emoji.value = emojiName;
        emoji.emojiUrl = emojiUrlFor(emojiName);
        emoji.isLast = emojis.length - 1 === index;

        emojiList.push(emoji);
      });

      return emojiList;
    } else {
      return [];
    }
  },

  @action
  editValue(index) {
    const item = this.collection[index];
    if (item.isEditable) {
      set(item, "isEditing", !item.isEditing);
      schedule("afterRender", () => {
        const textbox = document.querySelector(
          `[data-index="${index}"] .value-input`
        );
        if (textbox) {
          textbox.focus();
        }
      });
    }
  },

  @action
  changeValue(index, newValue) {
    const item = this.collection[index];

    if (this._checkInvalidInput(newValue)) {
      const oldValues = this.values.split("|").filter(Boolean);

      set(item, "value", oldValues[index - 1]);
      set(item, "isEditing", !item.isEditing);

      return;
    }

    this._replaceValue(index, newValue);

    set(item, "isEditing", !item.isEditing);
  },

  @action
  addValue() {
    if (this._checkInvalidInput([this.emojiName])) {
      return;
    }
    this._addValue(this.emojiName);
    this.set("emojiName", null);
  },

  @action
  removeValue(value) {
    this._removeValue(value);
  },

  @action
  shiftUp(index) {
    if (!index) {
      return;
    }

    this.shift(index, -1);
  },

  shift(index, operation) {
    if (!operation) {
      return;
    }

    const nextIndex = index + operation;
    const temp = this.collection[index];
    this.collection[index] = this.collection[nextIndex];
    this.collection[nextIndex] = temp;
    this._saveValues();
  },

  @action
  shiftDown(index) {
    if (index === this.collection.length - 1) {
      return;
    }

    this.shift(index, 1);
  },

  _checkInvalidInput(input) {
    this.set("validationMessage", null);

    if (!emojiUrlFor(input)) {
      this.set(
        "validationMessage",
        I18n.t("admin.site_settings.emoji_list.invalid_input")
      );
      return true;
    }

    return false;
  },

  _addValue(value) {
    const object = {
      value,
      emojiUrl: emojiUrlFor(value),
      isEditable: true,
      isEditing: false,
      isLast: true,
    };
    this.collection.addObject(object);
    this._saveValues();
  },

  _removeValue(value) {
    this.collection.removeObject(value);
    this._saveValues();
  },

  _replaceValue(index, newValue) {
    const item = this.collection[index];
    if (item.value === newValue) {
      return;
    }
    set(item, "value", newValue);
    this._saveValues();
  },

  _saveValues() {
    this.set("values", this.collection.mapBy("value").join("|"));
  },
});