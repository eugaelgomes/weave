const { NotionClient } = require("./notion.client");

/**
 * Action definitions for Notion integration.
 */
const notionActions = {
  createPage: {
    handler: async (params, credentials) => {
      const client = new NotionClient(credentials);
      return await client.createPage(params);
    },
    schema: {
      content: { description: "Initial block text content", required: false, type: "string" },
      parentId: { description: "Parent page or database ID", required: true, type: "string" },
      title: { description: "Title of the page", required: true, type: "string" },
    },
  },

  getPage: {
    handler: async (params, credentials) => {
      const client = new NotionClient(credentials);
      return await client.getPage(params);
    },
    schema: {
      pageId: { description: "Notion Page ID", required: true, type: "string" },
    },
  },

  queryDatabase: {
    handler: async (params, credentials) => {
      const client = new NotionClient(credentials);
      return await client.queryDatabase(params);
    },
    schema: {
      databaseId: { description: "Notion Database ID to query", required: true, type: "string" },
      filter: { description: "Filter criteria for query", required: false, type: "object" },
      pageSize: { description: "Page size limit (max: 100)", required: false, type: "number" },
    },
  },
};

module.exports = { notionActions };
