import joplin from "api";
import { I18n } from "i18n";
import * as path from "path";
import * as moment from "moment";
import { settings } from "./settings";
import { MenuItemLocation } from "api/types";

let i18n: any;

namespace extractParagraphs {
  export async function init() {
    await extractParagraphs.translate();
    await settings.register();
    await extractParagraphs.registerCommands();
  }

  export async function registerCommands() {
    await joplin.commands.register({
      name: "CombineNotes",
      label: i18n.__("cmd.combinenote"),
      execute: async () => {
        await extractParagraphs.combine();
      },
    });

    await joplin.views.menuItems.create(
      "myMenuItemToolsCombineNotes",
      "CombineNotes",
      MenuItemLocation.Tools
    );
    await joplin.views.menuItems.create(
      "contextMenuItemconcatCombineNotes",
      "CombineNotes",
      MenuItemLocation.NoteListContextMenu
    );
  }

  export async function combine() {
    const ids = await joplin.workspace.selectedNoteIds();
    if (ids.length > 1) {
      const newNoteBody = [];
      let notebookId = null;
      const newTags = [];
      let preserveMetadata = [];
      const preserveUrl = await joplin.settings.value(
        "preserveMetadataSourceUrl"
      );
      const preserveCreatedDate = await joplin.settings.value(
        "preserveMetadataCreatedDate"
      );
      const preserveUpdatedDate = await joplin.settings.value(
        "preserveMetadataUpdatedDate"
      );
      const preserveMetadataLocation = await joplin.settings.value(
        "preserveMetadataLocation"
      );
      const preserveMetadataPrefix = await joplin.settings.value(
        "preserveMetadataPrefix"
      );
      const preserveMetadataSuffix = await joplin.settings.value(
        "preserveMetadataSuffix"
      );
      const preserveSourceNoteTitles = await joplin.settings.value(
        "preserveSourceNoteTitles"
      );
      const tagName = await joplin.settings.value("tagName");
      const replaceKeyword = await joplin.settings.value(
        "replaceKeywordwithTag"
      );

      const addCombineDate = await joplin.settings.value("addCombineDate");
      const dateFormat = await joplin.settings.globalValue("dateFormat");
      const timeFormat = await joplin.settings.globalValue("timeFormat");
      const combineDate = await extractParagraphs.getDateFormated(
        new Date().getTime(),
        dateFormat,
        timeFormat
      );

      // collect note data
      let titles = [];
      for (const noteId of ids) {
        preserveMetadata = [];
        const note = await joplin.data.get(["notes", noteId], {
          fields: [
            "title",
            "body",
            "parent_id",
            "source_url",
            "created_time",
            "updated_time",
            "latitude",
            "longitude",
            "altitude",
          ],
        });
        titles.push(note.title);

        // Preserve metadata
        if (preserveUrl === true && note.source_url != "") {
          preserveMetadata.push(
            "[" + i18n.__("field.sourceURL") + "](" + note.source_url + ")"
          );
        }

        if (preserveCreatedDate === true) {
          const createdDate = await extractParagraphs.getDateFormated(
            note.created_time,
            dateFormat,
            timeFormat
          );
          preserveMetadata.push(
            i18n.__("field.createdDate") + ": " + createdDate
          );
        }

        if (preserveUpdatedDate === true) {
          const updatedDate = await extractParagraphs.getDateFormated(
            note.updated_time,
            dateFormat,
            timeFormat
          );
          preserveMetadata.push(
            i18n.__("field.updatedDate") + ": " + updatedDate
          );
        }

        if (addCombineDate === true) {
          preserveMetadata.push(
            i18n.__("field.combineDate") + ": " + combineDate
          );
        }

        if (
          preserveMetadataLocation === true &&
          (note.latitude != "0.00000000" ||
            note.longitude != "0.00000000" ||
            note.altitude != "0.0000")
        ) {
          preserveMetadata.push(
            [
              i18n.__("field.location") + ":",
              i18n.__("field.locationLat") + ":",
              note.latitude,
              i18n.__("field.locationLon") + ":",
              note.longitude,
              i18n.__("field.locationAltitude") + ":",
              note.altitude,
            ].join(" ")
          );
        }

        if (preserveMetadata.length > 0) {
          if (preserveMetadataPrefix != "") {
            newNoteBody.push(preserveMetadataPrefix + "\n");
          }

          newNoteBody.push(preserveMetadata.join("\n") + "\n");

          if (preserveMetadataSuffix != "") {
            newNoteBody.push(preserveMetadataSuffix + "\n");
          }
        }

        if (tagName.length < 0) {
          /* if (preserveSourceNoteTitles === true) {
            newNoteBody.push("# " + note.title + "\n");
          }
           newNoteBody.push(note.body + "\n"); */
        } else {
          const paragraphs = note.body.split("\n\n");
          let savetitle = false;
          for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            if (p.indexOf(tagName) >= 0) {
              if (preserveSourceNoteTitles === true && !savetitle) {
                newNoteBody.push("# " + note.title + "\n");
                savetitle = true;
              }
              if (replaceKeyword === true) {
                const rp = p.replace(tagName, "");
                newNoteBody.push(rp + "\n");
              }
            }
          }
        }

        let pageNum = 0;
        do {
          var noteTags = await joplin.data.get(["notes", noteId, "tags"], {
            fields: "id",
            limit: 50,
            page: pageNum++,
          });
          for (const tag of noteTags.items) {
            if (newTags.indexOf(tag.id) === -1) {
              newTags.push(tag.id);
            }
          }
        } while (noteTags.has_more);

        if (!notebookId) notebookId = note.parent_id;
      }
      if (tagName.length >= 0) {
        newNoteBody.push(tagName + "\n");
      }

      const asToDo = await joplin.settings.value("asToDo");

      const titleOption = await joplin.settings.value("combinedNoteTitle");
      let newTitle = i18n.__("settings.combinedNoteTitleValueDefault");
      if (titleOption == "first") {
        newTitle = titles[0];
      } else if (titleOption == "last") {
        newTitle = titles[titles.length - 1];
      } else if (titleOption == "combined") {
        newTitle = titles.join(", ");
      } else if (titleOption == "custom") {
        newTitle = await joplin.settings.value("combinedNoteTitleCustom");
        newTitle = newTitle.replace("{{FIRSTTITLE}}", titles[0]);
        newTitle = newTitle.replace("{{LASTTITLE}}", titles[titles.length - 1]);
        newTitle = newTitle.replace("{{ALLTITLE}}", titles.join(", "));
        newTitle = newTitle.replace("{{DATE}}", combineDate);
      }

      // create new note
      const newNoteData = {
        title: newTitle,
        body: newNoteBody.join("\n"),
        parent_id: notebookId,
        is_todo: asToDo,
      };
      const newNote = await joplin.data.post(["notes"], null, newNoteData);

      // Add Tags
      for (const tag of newTags) {
        await joplin.data.post(["tags", tag, "notes"], null, {
          id: newNote.id,
        });
      }

      // delete combined notes
      const deleteNotes = await joplin.settings.value("deleteCombinedNotes");
      if (deleteNotes === true) {
        for (const noteId of ids) {
          await joplin.data.delete(["notes", noteId]);
        }
      }

      await joplin.commands.execute("openNote", newNote.id);
    }
  }

  export async function translate() {
    const joplinLocale = await joplin.settings.globalValue("locale");
    const installationDir = await joplin.plugins.installationDir();

    i18n = new I18n({
      locales: ["en_US", "de_DE"],
      defaultLocale: "en_US",
      fallbacks: { "en_*": "en_US" },
      updateFiles: false,
      retryInDefaultLocale: true,
      syncFiles: true,
      directory: path.join(installationDir, "locales"),
    });
    i18n.setLocale(joplinLocale);
  }

  export async function getDateFormated(
    epoch: number,
    dateFormat: string,
    timeFormat: string
  ): Promise<string> {
    if (epoch !== 0) {
      const dateObject = new Date(epoch);
      const dateString =
        moment(dateObject.getTime()).format(dateFormat) +
        " " +
        moment(dateObject.getTime()).format(timeFormat);

      return dateString;
    } else {
      return "";
    }
  }
}

export { extractParagraphs, i18n };
