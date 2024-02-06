import joplin from "api";
import { SettingItemType } from "api/types";
import { i18n } from "./extractParagraphs";

export namespace settings {
  export async function register() {
    await joplin.settings.registerSection("extractParagraphSection", {
      label: "Paragraph Extractor",
      iconName: "fas fa-layer-group",
    });

    await joplin.settings.registerSettings({
      preserveSourceNoteTitles: {
        value: true,
        type: SettingItemType.Bool,
        section: "extractParagraphSection",
        public: true,
        label: i18n.__("settings.preserveSourceNoteTitles"),
        description: i18n.__("settings.preserveSourceNoteTitlesDescription"),
      },

      extractAtBulletLevel: {
        value: false,
        type: SettingItemType.Bool,
        section: "extractParagraphSection",
        public: true,
        label: i18n.__("settings.extractAtBulletLevel"),
        description: i18n.__("settings.extractAtBulletLevelDescription"),
      },

      ignoreCase: {
        value: true,
        type: SettingItemType.Bool,
        section: "extractParagraphSection",
        public: true,
        label: i18n.__("settings.ignoreCase"),
        description: i18n.__("settings.ignoreCaseDescription"),
      },

      includeHeaders: {
        value: false,
        type: SettingItemType.Bool,
        section: "extractParagraphSection",
        public: true,
        label: i18n.__("settings.includeHeaders"),
        description: i18n.__("settings.includeHeadersDescription"),
      },

      tagPrefix: {
        value: "#",
        type: SettingItemType.String,
        section: "extractParagraphSection",
        public: true,
        label: i18n.__("settings.tagPrefix"),
        description: i18n.__("settings.tagPrefixDescription"),
      },

      tagName: {
        value: "",
        type: SettingItemType.String,
        section: "extractParagraphSection",
        public: true,
        label: i18n.__("settings.tagName"),
        description: i18n.__("settings.tagNameDescription"),
      },

      replaceKeywordwithTag: {
        value: false,
        type: SettingItemType.Bool,
        section: "extractParagraphSection",
        public: true,
        label: i18n.__("settings.replaceKeywordwithTag"),
        description: i18n.__("settings.replaceKeywordwithTagDescription"),
      },

      combinedNoteTitle: {
        value: "default",
        type: SettingItemType.String,
        section: "extractParagraphSection",
        isEnum: true,
        public: true,
        label: i18n.__("settings.combinedNoteTitle"),
        options: {
          default: i18n.__("settings.combinedNoteTitleValueDefault"),
          first: i18n.__("settings.combinedNoteTitleValueFirst"),
          last: i18n.__("settings.combinedNoteTitleValueLast"),
          custom: i18n.__("settings.combinedNoteTitleValueCustom"),
        },
      },

      combinedNoteTitleCustom: {
        value: "",
        type: SettingItemType.String,
        section: "extractParagraphSection",
        public: true,
        label: i18n.__("settings.combinedNoteTitleCustom"),
        description: i18n.__(
          "settings.combinedNoteTitleCustomDescription",
          "{{FIRSTTITLE}}, {{LASTTITLE}}, {{ALLTITLE}}, {{DATE}}"
        ),
      },
    });
  }
}
