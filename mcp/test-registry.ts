import registry from "./src/modules/index";

console.log(`Registered Tools: ${Object.keys(registry.tools).length}`);
console.log(Object.keys(registry.tools));

console.log(`Registered Resources: ${registry.resources.templates.length}`);
registry.resources.templates.forEach(t => console.log(t.uriTemplate));
