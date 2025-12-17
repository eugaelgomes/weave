require("module-alias/register");
const { app } = require("@/app");
const port = process.env.APP_PORT ? Number(process.env.APP_PORT) : 8080;

try {
  if (!port || isNaN(port)) {
    process.exit(1);
  }
  app.listen(port, "0.0.0.0", () => {});
  console.log(`Weave Notes API running at port ${port} :)`);
} catch (error) {
  console.error("Error starting the application:", error);
  process.exit(1);
}
