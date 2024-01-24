import * as auto from "inquirer-autocomplete-prompt";
import * as inquirer from "inquirer";

const inq = inquirer.default;

inq.registerPrompt(
  "autocomplete",
  auto.default
);

async function choices(message, items, type, defaults, pageSize = 5) {
  return (
    await inq.prompt({
      type: type,
      name: "item",
      choices: items,
      message: message,
      default: defaults,
      pageSize: pageSize,
      source: function (answersYet, input) {
        if (!input) {
          return items;
        }

        if (input.startsWith("\"")) {
          input = input.replace(/\"/g, "");
          return items.filter(
            (p) =>
              !p.value || p.value.name.toLowerCase().includes(input.toLowerCase()));
        }

        const split = input.split(" ");        
        return items.filter(
          (p) =>
            !p.value ||
            split.filter((f) => p.value.readme.toLowerCase().includes(f.toLowerCase()))
              .length === split.length
        );
      },
    })
  ).item;
}

async function files(message) {
  return (
    await inq.default.prompt({
      type: "file-tree-selection",
      name: "files",
      message: message,
      multiple: true
    })
  ).files;
}

async function text(message, defaultValue) {
  return (
    await inq.prompt({
      type: "input",
      name: "text",
      default: defaultValue,
      message: message,
    })
  ).text;
}
async function autocomplete(message, items) {
  return await choices(message, items, "autocomplete", null, 7);
}

async function list(message, items) {
  return await choices(message, items, "list", null);
}

async function checkbox(message, items, defaults) {
  let list = [];
  do {
    list = await choices(message, items, "checkbox", defaults);
  } while (list.length === 0);
  return list;
}

async function prompt(message) {
  return (
    await inq.default.promptprompt({
      type: "confirm",
      name: "choice",
      default: "Yes",
      message: message,
    })
  ).choice;
}

export default {
  autocomplete,
  list,
  checkbox,
  text,
  prompt,
  files,
};
