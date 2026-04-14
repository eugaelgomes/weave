const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const projectsCreateRepository = require("@/modules/projects/repositories/projects-create.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const projectsDeleteRepository = require("@/modules/projects/repositories/projects-delete.repository");

const repos = [
  projectsReadRepository,
  projectsCreateRepository,
  projectsUpdateRepository,
  projectsDeleteRepository,
];

/**
 * Fachada única do repositório de projetos: delega para read / create / update / delete.
 * Mantém a API anterior (`getAllProjects`, `createProjectWithStages`, …) para o restante do código.
 */
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      for (const repo of repos) {
        const value = repo[prop];
        if (typeof value === "function") {
          return value.bind(repo);
        }
      }
      return undefined;
    },
  }
);
