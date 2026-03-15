import path from "path";
import moduleAlias from "module-alias";

const baseFolder = path.resolve(__dirname, "..");

moduleAlias.addAliases({
  "@": baseFolder,
});
