const finalToolCalls = [];
const chunks = [
  { index: 0, id: "call_1", function: { name: "get_project_details" } },
  { index: 0, function: { name: "get_project_details" } },
  { index: 0, function: { name: "get_project_details", arguments: "{\n" } },
  { index: 0, function: { arguments: '  "projectId": "123"\n' } },
  { index: 0, function: { arguments: "}" } },
];

for (const tc of chunks) {
  const tcIndex = tc.index !== undefined ? tc.index : 0;
  if (!finalToolCalls[tcIndex]) {
    finalToolCalls[tcIndex] = {
      id: tc.id,
      type: "function",
      function: { name: "", arguments: "" },
    };
  }
  if (tc.id && !finalToolCalls[tcIndex].id) {
    finalToolCalls[tcIndex].id = tc.id;
  }

  // MY FIX:
  if (tc.function?.name) {
    if (tc.function.name === finalToolCalls[tcIndex].function.name) {
      // Duplicate full name from some providers, ignore
    } else if (
      tc.function.name.startsWith(finalToolCalls[tcIndex].function.name)
    ) {
      // Cumulative name, overwrite
      finalToolCalls[tcIndex].function.name = tc.function.name;
    } else {
      // Partial chunked name, append
      finalToolCalls[tcIndex].function.name += tc.function.name;
    }
  }

  if (tc.function?.arguments) {
    if (tc.function.arguments === finalToolCalls[tcIndex].function.arguments) {
      // Duplicate full arguments from some providers, ignore
    } else if (
      tc.function.arguments.startsWith(
        finalToolCalls[tcIndex].function.arguments
      )
    ) {
      // Cumulative arguments, overwrite
      finalToolCalls[tcIndex].function.arguments = tc.function.arguments;
    } else {
      // Partial chunked arguments, append
      finalToolCalls[tcIndex].function.arguments += tc.function.arguments;
    }
  }
}

console.log(JSON.stringify(finalToolCalls, null, 2));
