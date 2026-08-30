const fs = require('fs');
const path = 'server/src/modules/organizations/repositories/organizations.repository.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/const { generatePublicId } = require\("@\/utils\/formatters.util"\);/, `const { generatePublicId } = require("@/utils/formatters.util");\nconst organizationSettingsRepository = require("./organization-settings.repository");`);

// Remove obsolete properties from getOrgsByUserId
content = content.replace(/o\.default_timezone,\s*o\.default_locale,\s*o\.country,\s*o\.deleted,\s*o\.created_at,\s*o\.updated_at,\s*o\.settings,\s*p\.details AS plan_snapshot,\s*o\.deleted_at,\s*o\.deleted_by,\s*o\.plan_id,\s*o\.branding_properties,\s*o\.integrations,/g, `o.country,
      o.deleted,
      o.created_at,
      o.updated_at,
      p.details AS plan_snapshot,
      o.deleted_at,
      o.deleted_by,
      o.plan_id,`);

// Remove from createOrgs parameters
content = content.replace(/description,\s*default_timezone,\s*default_locale,\s*country,\s*settings/g, `description,
    country`);

// Remove from insertOrgQuery in createOrgs
content = content.replace(/description,\s*default_timezone,\s*default_locale,\s*country,\s*settings,\s*plan_id/g, `description,
        country,
        plan_id`);

content = content.replace(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10::jsonb, \$11, \$12, \$13\)/, `VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`);

content = content.replace(/description,\s*default_timezone,\s*default_locale,\s*country,\s*settings,\s*defaultPlanId,\s*publicId,\s*publicOrganizationId/g, `description,
        country,
        defaultPlanId,
        publicId,
        publicOrganizationId`);

// Also update createOrgs to call createDefaultSettings
content = content.replace(/\/\/ Create root \(central\) area of the organization/, `// Create default organization settings
      await organizationSettingsRepository.createDefaultSettings(organization.id, client);

      // Create root (central) area of the organization`);

// Let's remove the updateSettings and updateBranding methods completely
content = content.replace(/\s*async updateSettings\([^)]*\)\s*{[^}]*?}[^}]*?}[^}]*?}[^}]*?}[^}]*?}/g, ''); // Too complex regex.

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed partially!');
