const spacesService = require("@/services/storage");
const { getI18n, getLangFromReq } = require("../../utils/weave-ai-i18n.util");

function validateAuthentication(req) {
  const userId = req.user?.userId;
  if (!userId) {
    const userLanguage = getLangFromReq(req);
    const t = getI18n(userLanguage);
    const error = new Error(t.unauthenticated);
    error.statusCode = 401;
    throw error;
  }
  return userId;
}

async function processKnowledgeFileUploads(files, userId) {
  const knowledgeFiles = [];
  for (const file of files) {
    const extension = file.originalname.split(".").pop();
    const uniqueName = spacesService.generateUniqueFileName(extension);
    const path = `agents/files/${userId}/${uniqueName}`;

    const fileUrl = await spacesService.uploadFile(
      file.buffer,
      path,
      file.mimetype
    );

    knowledgeFiles.push({
      original_name: file.originalname,
      storage_path: path,
      url: fileUrl,
      mime_type: file.mimetype,
      size: file.size,
      uploaded_at: new Date().toISOString(),
    });
  }
  return knowledgeFiles;
}

function parseKnowledgeFiles(agent) {
  let knowledgeFiles = agent.knowledge_files;
  if (typeof knowledgeFiles === "string") {
    try {
      knowledgeFiles = JSON.parse(knowledgeFiles);
    } catch {
      knowledgeFiles = [];
    }
  }
  if (!Array.isArray(knowledgeFiles)) {
    knowledgeFiles =
      agent.personality?.capabilities?.knowledge_base?.sources || [];
  }
  return Array.isArray(knowledgeFiles) ? knowledgeFiles : [];
}

module.exports = {
  validateAuthentication,
  processKnowledgeFileUploads,
  parseKnowledgeFiles
};